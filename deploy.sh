#!/bin/bash
set -e

# -------------------------------------------------------------------------
# VIBESMITH DEPLOYMENT SCRIPT
# -------------------------------------------------------------------------
# This script handles the complete deployment process for the Vibesmith app:
# 1. Verifies GCP project and authentication
# 2. Enables required APIs
# 3. Sets up Cloud SQL PostgreSQL database
# 4. Creates database user and database
# 5. Configures environment variables for production
# 6. Builds and deploys the application to Cloud Run
# -------------------------------------------------------------------------

# Display usage information
show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --update-password    Force update of database user password (use with caution)"
  echo "  --help               Display this help message"
  echo ""
  echo "Description:"
  echo "  This script deploys the Vibesmith application to Google Cloud Run."
  echo "  It will reuse existing credentials for redeployments to maintain database access."
  echo ""
}

# Process command line arguments
if [ "$1" = "--help" ]; then
  show_help
  exit 0
fi

# Configuration variables
PROJECT_ID="vibesmith-456523"
SERVICE_NAME="vibesmith"
REGION="us-central1"
INSTANCE_NAME="vibesmith-db"
DB_NAME="vibesmith"
DB_USER="vibesmith-user"
TIER="db-f1-micro"
ENV_FILE=".env.production"
TIMEOUT="600s"
LOG_FILE="deploy-$(date +%Y%m%d-%H%M%S).log"

# Function for styled console output
log() {
  local style=$1
  local message=$2
  
  case $style in
    "header") echo -e "\n\033[1;36m==== $message ====\033[0m" | tee -a $LOG_FILE ;;
    "info") echo -e "\033[0;34m[INFO]\033[0m $message" | tee -a $LOG_FILE ;;
    "success") echo -e "\033[0;32m[SUCCESS]\033[0m $message" | tee -a $LOG_FILE ;;
    "warning") echo -e "\033[0;33m[WARNING]\033[0m $message" | tee -a $LOG_FILE ;;
    "error") echo -e "\033[0;31m[ERROR]\033[0m $message" | tee -a $LOG_FILE ;;
    *) echo "$message" | tee -a $LOG_FILE ;;
  esac
}

# Function to check and enable required APIs
enable_api() {
  local api_name=$1
  log "info" "Checking if $api_name API is enabled..."
  
  if ! gcloud services list --project=$PROJECT_ID --filter="name:$api_name" --format="value(name)" | grep -q "$api_name"; then
    log "info" "Enabling $api_name API..."
    if gcloud services enable $api_name --project=$PROJECT_ID >> $LOG_FILE 2>&1; then
      log "success" "$api_name API has been enabled."
    else
      log "error" "Failed to enable $api_name API. Check $LOG_FILE for details."
      exit 1
    fi
  else
    log "success" "$api_name API is already enabled."
  fi
}

# Function to wait for async operation
wait_for_operation() {
  local operation_id=$1
  local description=$2
  
  if [ -z "$operation_id" ]; then
    log "warning" "No operation ID found for $description. Continuing..."
    return
  fi
  
  log "info" "Monitoring $description operation: $operation_id"
  while true; do
    local op_status=$(gcloud sql operations describe $operation_id --project=$PROJECT_ID --format="value(status)" 2>> $LOG_FILE)
    log "info" "Operation status: $op_status"
    
    if [ "$op_status" = "DONE" ]; then
      log "success" "Operation completed successfully!"
      break
    elif [ "$op_status" = "ERROR" ]; then
      log "error" "Operation failed. Check $LOG_FILE for details."
      exit 1
    fi
    
    log "info" "Waiting for operation to complete... (Checking again in 10 seconds)"
    sleep 10
  done
}

# Start deployment process
log "header" "STARTING VIBESMITH DEPLOYMENT"
log "info" "Logging details to $LOG_FILE"

# -------------------------------------------------------------------------
# STEP 1: Verify GCP project and authentication
# -------------------------------------------------------------------------
log "header" "STEP 1: VERIFYING GCP PROJECT AND AUTHENTICATION"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  log "error" "gcloud could not be found. Please install the Google Cloud SDK."
  exit 1
fi

# Check if logged in
log "info" "Checking gcloud authentication..."
ACCOUNT=$(gcloud config list account --format "value(core.account)" 2>> $LOG_FILE)
if [ -z "$ACCOUNT" ]; then
  log "error" "Not logged in to gcloud. Please run 'gcloud auth login' first."
  exit 1
else
  log "success" "Authenticated as: $ACCOUNT"
fi

# Check project access
log "info" "Verifying access to project: $PROJECT_ID"
if ! gcloud projects describe $PROJECT_ID --format="value(projectId)" &> /dev/null; then
  log "error" "Cannot access project $PROJECT_ID. Please check if it exists and you have access."
  exit 1
else
  log "success" "Project access verified: $PROJECT_ID"
fi

# Check if billing is enabled
log "info" "Checking if billing is enabled..."
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>> $LOG_FILE || echo "UNKNOWN")
if [ "$BILLING_ENABLED" = "UNKNOWN" ]; then
  log "warning" "Could not determine billing status. You may not have billing admin permissions."
else
  if [ "$BILLING_ENABLED" = "True" ]; then
    log "success" "Billing is enabled for the project."
  else
    log "error" "Billing is NOT enabled for the project. Cloud SQL requires billing to be enabled."
    exit 1
  fi
fi

# -------------------------------------------------------------------------
# STEP 2: Enable required APIs
# -------------------------------------------------------------------------
log "header" "STEP 2: ENABLING REQUIRED APIS"

# List of required APIs
REQUIRED_APIS=(
  "sqladmin.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "serviceusage.googleapis.com"
  "compute.googleapis.com"
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
  "iam.googleapis.com"
  "containerregistry.googleapis.com"
  "vpcaccess.googleapis.com"
)

# Enable each API
for api in "${REQUIRED_APIS[@]}"; do
  enable_api $api
done

# -------------------------------------------------------------------------
# STEP 3: Set up Cloud SQL PostgreSQL database
# -------------------------------------------------------------------------
log "header" "STEP 3: SETTING UP CLOUD SQL POSTGRESQL DATABASE"

# Check if we already have a password in .env.production
if [ -f "$ENV_FILE" ] && grep -q "DB_PASSWORD" "$ENV_FILE"; then
  log "info" "Using existing database password from $ENV_FILE"
  DB_PASSWORD=$(grep DB_PASSWORD "$ENV_FILE" | cut -d '"' -f 2)
else
  log "error" "no DB_PASSWORD found in $ENV_FILE"
  exit 1
fi

# Check if Cloud SQL instance exists
log "info" "Checking if Cloud SQL instance exists..."
if ! gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
  log "info" "Creating new Cloud SQL instance '$INSTANCE_NAME'..."
  
  # Create instance with async operation
  log "info" "This may take several minutes..."
  if gcloud sql instances create $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --database-version=POSTGRES_14 \
    --tier=$TIER \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=10GB \
    --availability-type=ZONAL \
    --root-password=$DB_PASSWORD \
    --async \
    >> $LOG_FILE 2>&1; then
    
    # Get the operation ID and wait for completion
    OPERATION_ID=$(gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID --format="value(name)" | head -n 1)
    wait_for_operation "$OPERATION_ID" "Cloud SQL instance creation"
  else
    log "error" "Failed to create Cloud SQL instance. Check $LOG_FILE for details."
    exit 1
  fi
else
  log "success" "Cloud SQL instance '$INSTANCE_NAME' already exists."
fi

# Check instance status
log "info" "Checking instance status..."
INSTANCE_STATUS=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format="value(state)" 2>> $LOG_FILE)
log "info" "Instance status: $INSTANCE_STATUS"

# Create database if it doesn't exist
log "info" "Checking if database exists..."
if ! gcloud sql databases list --instance=$INSTANCE_NAME --project=$PROJECT_ID 2>> $LOG_FILE | grep -q $DB_NAME; then
  log "info" "Creating database '$DB_NAME'..."
  if gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID >> $LOG_FILE 2>&1; then
    log "success" "Database '$DB_NAME' created successfully."
  else
    log "error" "Failed to create database. Check $LOG_FILE for details."
    exit 1
  fi
else
  log "success" "Database '$DB_NAME' already exists."
fi

# Create user if it doesn't exist
log "info" "Checking if database user exists..."
USER_EXISTS=false
if ! gcloud sql users list --instance=$INSTANCE_NAME --project=$PROJECT_ID 2>> $LOG_FILE | grep -q $DB_USER; then
  log "info" "Creating user '$DB_USER'..."
  if gcloud sql users create $DB_USER --instance=$INSTANCE_NAME --password=$DB_PASSWORD --project=$PROJECT_ID >> $LOG_FILE 2>&1; then
    log "success" "User '$DB_USER' created successfully."
  else
    log "error" "Failed to create database user. Check $LOG_FILE for details."
    exit 1
  fi
else
  USER_EXISTS=true
  log "success" "User '$DB_USER' already exists."
  
  # Only update password if this is a first-time script run with a recovered password
  if [ "$1" = "--update-password" ]; then
    log "info" "Updating user password as requested..."
    if gcloud sql users set-password $DB_USER --instance=$INSTANCE_NAME --password=$DB_PASSWORD --project=$PROJECT_ID >> $LOG_FILE 2>&1; then
      log "success" "Password updated successfully."
    else
      log "error" "Failed to update user password. Check $LOG_FILE for details."
      exit 1
    fi
  else
    log "info" "Keeping existing user password (use --update-password to force update)."
  fi
fi

# Get the connection information
log "info" "Getting connection information..."
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format='value(connectionName)' 2>> $LOG_FILE)
log "success" "Instance connection name: $INSTANCE_CONNECTION_NAME"

log "info" "Getting IP address..."
DB_HOST=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format='value(ipAddresses[0].ipAddress)' 2>> $LOG_FILE)
log "success" "Database host IP: $DB_HOST"

# -------------------------------------------------------------------------
# STEP 4: Configure environment variables for production
# -------------------------------------------------------------------------
log "header" "STEP 4: CONFIGURING ENVIRONMENT VARIABLES"

# Load environment variables
log "info" "Loading environment variables from $ENV_FILE..."
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Check for required environment variables
if [ -z "$SPOTIFY_CLIENT_ID" ] || [ -z "$SPOTIFY_CLIENT_SECRET" ] || [ -z "$NEXTAUTH_SECRET" ]; then
  log "error" "Required environment variables not set."
  log "error" "Make sure SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and NEXTAUTH_SECRET are defined."
  exit 1
fi

# -------------------------------------------------------------------------
# STEP 5: Build and deploy Docker image to Cloud Run
# -------------------------------------------------------------------------
log "header" "STEP 5: BUILDING AND DEPLOYING TO CLOUD RUN"

# Setup VPC connector for Cloud SQL access
VPC_CONNECTOR_NAME="${SERVICE_NAME}-connector"
log "info" "Setting up VPC connector for Cloud SQL access..."
if ! gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
  log "info" "Creating VPC connector $VPC_CONNECTOR_NAME..."
  # First create a subnet range if needed for the connector
  if gcloud compute networks vpc-access connectors create $VPC_CONNECTOR_NAME \
    --region=$REGION \
    --network=default \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=3 \
    --project=$PROJECT_ID \
    >> $LOG_FILE 2>&1; then
    log "success" "VPC connector $VPC_CONNECTOR_NAME created successfully."
  else
    log "error" "VPC connector creation failed. Database access will not work without it."
    log "error" "You may need to manually create a VPC connector or check your project permissions."
    exit 1  # This is critical enough to stop deployment
  fi
else
  log "success" "VPC connector $VPC_CONNECTOR_NAME already exists."
fi

# Build the Docker image
log "info" "Building Docker image..."
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_URL="gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG"

if docker buildx build --platform linux/amd64 -t $IMAGE_URL . >> $LOG_FILE 2>&1; then
  log "success" "Docker image built successfully: $IMAGE_URL"
else
  log "error" "Failed to build Docker image. Check $LOG_FILE for details."
  exit 1
fi

# Push the image to Google Container Registry
log "info" "Pushing image to Google Container Registry..."
if docker push $IMAGE_URL >> $LOG_FILE 2>&1; then
  log "success" "Image pushed successfully to GCR."
else
  log "error" "Failed to push image to GCR. Check $LOG_FILE for details."
  exit 1
fi

# Deploy to Cloud Run
log "info" "Deploying to Cloud Run..."
if gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --vpc-connector $VPC_CONNECTOR_NAME \
  --set-env-vars DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME?schema=public" \
  --set-env-vars SPOTIFY_CLIENT_ID="$SPOTIFY_CLIENT_ID" \
  --set-env-vars SPOTIFY_CLIENT_SECRET="$SPOTIFY_CLIENT_SECRET" \
  --set-env-vars NEXTAUTH_URL="$NEXTAUTH_URL" \
  --set-env-vars NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  --set-env-vars NODE_ENV="production" \
  >> $LOG_FILE 2>&1; then
  
  log "success" "Deployed successfully to Cloud Run."
else
  log "error" "Failed to deploy to Cloud Run. Check $LOG_FILE for details."
  exit 1
fi

# Get the deployed URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' 2>> $LOG_FILE)

# Update NEXTAUTH_URL in .env.production if needed
if [ "$NEXTAUTH_URL" != "$SERVICE_URL" ]; then
  log "info" "Updating NEXTAUTH_URL in $ENV_FILE..."
  sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"$SERVICE_URL\"|" $ENV_FILE 2>/dev/null || \
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"$SERVICE_URL\"|" $ENV_FILE
  
  # Reload environment variables from updated file
  log "info" "Reloading environment variables..."
  export $(grep -v '^#' "$ENV_FILE" | xargs)
  
  # Update the deployed service with new env vars
  log "info" "Updating deployed service with new NEXTAUTH_URL..."
  gcloud run services update $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --set-env-vars NEXTAUTH_URL="$SERVICE_URL" \
    >> $LOG_FILE 2>&1
fi

# -------------------------------------------------------------------------
# STEP 6: Apply Prisma migrations to production database
# -------------------------------------------------------------------------
log "header" "STEP 6: APPLYING DATABASE MIGRATIONS"

# Run Prisma migrations
log "info" "Running Prisma migrations on production database..."
if DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy >> $LOG_FILE 2>&1; then
  log "success" "Database migrations applied successfully."
else
  log "error" "Failed to apply database migrations. Check $LOG_FILE for details."
  # Continue with warning - don't exit since the app is already deployed
  log "warning" "You may need to manually apply migrations by connecting to the database."
fi

# Clean up sensitive environment variables
unset SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET NEXTAUTH_SECRET DB_PASSWORD

# -------------------------------------------------------------------------
# DEPLOYMENT SUMMARY
# -------------------------------------------------------------------------
log "header" "DEPLOYMENT SUMMARY"
log "success" "Vibesmith app has been successfully deployed!"
log "success" "Application URL: $SERVICE_URL"
log "info" "Database Instance: $INSTANCE_NAME"
log "info" "Database Name: $DB_NAME"
log "info" "Database User: $DB_USER"
log "info" "All logs have been saved to: $LOG_FILE"
log "warning" "IMPORTANT: Keep your $ENV_FILE secure as it contains sensitive information."

echo ""
echo "🎉 Deployment completed successfully! 🎉"
echo "Access your application at: $SERVICE_URL" 