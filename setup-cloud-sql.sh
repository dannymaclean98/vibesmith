#!/bin/bash
set -e

# Enable debug logging
set -x

# Configuration variables
PROJECT_ID="vibesmith-456523"
INSTANCE_NAME="vibesmith-db"
DB_NAME="vibesmith"
DB_USER="vibesmith-user"
DB_PASSWORD=$(openssl rand -base64 16) # Generate a secure random password
REGION="us-central1"
TIER="db-f1-micro" # Smallest instance, suitable for dev/test
TIMEOUT="600s" # Add timeout for gcloud commands

# Function to check and enable required APIs
check_and_enable_api() {
  local api_name=$1
  echo "Checking if $api_name API is enabled..."
  
  if ! gcloud services list --project=$PROJECT_ID --filter="name:$api_name" --format="value(name)" | grep -q "$api_name"; then
    echo "$api_name API is not enabled. Enabling now..."
    gcloud services enable $api_name --project=$PROJECT_ID
    echo "$api_name API has been enabled."
  else
    echo "$api_name API is already enabled."
  fi
}

echo "Setting up Cloud SQL PostgreSQL instance..."

# Check if gcloud is installed and authenticated
echo "Checking gcloud authentication..."
gcloud config list account --format "value(core.account)" || { 
  echo "Error: Not authenticated with gcloud. Please run 'gcloud auth login' first."
  exit 1
}

# Verify project exists and is accessible
echo "Verifying project access..."
gcloud projects describe $PROJECT_ID --format="value(projectId)" || {
  echo "Error: Could not access project $PROJECT_ID. Please check if the project exists and you have access to it."
  exit 1
}

# Enable required APIs
check_and_enable_api "sqladmin.googleapis.com"
check_and_enable_api "cloudresourcemanager.googleapis.com"
check_and_enable_api "serviceusage.googleapis.com"

# Check if Cloud SQL instance exists with timeout
echo "Checking if Cloud SQL instance exists..."
if ! timeout $TIMEOUT gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
  echo "Creating new Cloud SQL instance '$INSTANCE_NAME'..."
  echo "Running command: gcloud sql instances create $INSTANCE_NAME --project=$PROJECT_ID ..."
  
  # Create instance with progress monitoring
  echo "This may take several minutes..."
  timeout $TIMEOUT gcloud sql instances create $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --database-version=POSTGRES_14 \
    --tier=$TIER \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=10GB \
    --availability-type=ZONAL \
    --root-password=$DB_PASSWORD \
    --async
  
  # Monitor operation status
  echo "Waiting for instance creation to complete..."
  OPERATION_ID=$(gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID --format="value(name)" | head -n 1)
  
  if [ -n "$OPERATION_ID" ]; then
    echo "Monitoring operation: $OPERATION_ID"
    while true; do
      OP_STATUS=$(gcloud sql operations describe $OPERATION_ID --project=$PROJECT_ID --format="value(status)")
      echo "Operation status: $OP_STATUS"
      
      if [ "$OP_STATUS" = "DONE" ]; then
        echo "Operation completed successfully!"
        break
      elif [ "$OP_STATUS" = "ERROR" ]; then
        echo "Operation failed."
        exit 1
      fi
      
      echo "Waiting for operation to complete... (Checking again in 10 seconds)"
      sleep 10
    done
  else
    echo "Warning: Could not find operation ID. Continuing..."
  fi
  
  echo "Cloud SQL instance creation initiated."
else
  echo "Cloud SQL instance '$INSTANCE_NAME' already exists."
fi

# Check instance status
echo "Checking instance status..."
INSTANCE_STATUS=$(timeout $TIMEOUT gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format="value(state)")
echo "Instance status: $INSTANCE_STATUS"

# Create database if it doesn't exist
echo "Checking if database exists..."
if ! timeout $TIMEOUT gcloud sql databases list --instance=$INSTANCE_NAME --project=$PROJECT_ID | grep -q $DB_NAME; then
  echo "Creating database '$DB_NAME'..."
  timeout $TIMEOUT gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID
  echo "Database creation completed."
else
  echo "Database '$DB_NAME' already exists."
fi

# Create user if it doesn't exist
echo "Checking if database user exists..."
if ! timeout $TIMEOUT gcloud sql users list --instance=$INSTANCE_NAME --project=$PROJECT_ID | grep -q $DB_USER; then
  echo "Creating user '$DB_USER'..."
  timeout $TIMEOUT gcloud sql users create $DB_USER --instance=$INSTANCE_NAME --password=$DB_PASSWORD --project=$PROJECT_ID
  echo "User creation completed."
else
  echo "User '$DB_USER' already exists."
  echo "Setting new password for user '$DB_USER'..."
  timeout $TIMEOUT gcloud sql users set-password $DB_USER --instance=$INSTANCE_NAME --password=$DB_PASSWORD --project=$PROJECT_ID
  echo "Password update completed."
fi

# Get the connection information
echo "Getting connection information..."
INSTANCE_CONNECTION_NAME=$(timeout $TIMEOUT gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format='value(connectionName)')
echo "Instance connection name: $INSTANCE_CONNECTION_NAME"

echo "Getting IP address..."
DB_HOST=$(timeout $TIMEOUT gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format='value(ipAddresses[0].ipAddress)')
echo "Database host IP: $DB_HOST"

# Create a .env.production file with the correct database connection details
echo "Creating .env.production file..."
cat > .env.production << EOF
# Database configuration
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?schema=public"
DB_HOST="${DB_HOST}"
DB_PASSWORD="${DB_PASSWORD}"

# Copy your Spotify credentials from .env
SPOTIFY_CLIENT_ID="$(grep SPOTIFY_CLIENT_ID .env | cut -d '"' -f 2)"
SPOTIFY_CLIENT_SECRET="$(grep SPOTIFY_CLIENT_SECRET .env | cut -d '"' -f 2)"

# NextAuth configuration (will be updated during deployment)
NEXTAUTH_URL="https://${PROJECT_ID}.run.app"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Node Environment
NODE_ENV="production"
EOF

echo "-------------------------------------------------"
echo "Cloud SQL PostgreSQL instance setup completed!"
echo "-------------------------------------------------"
echo "Instance Name: $INSTANCE_NAME"
echo "Database Name: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD"
echo "Host: $DB_HOST"
echo "Connection Name: $INSTANCE_CONNECTION_NAME"
echo "-------------------------------------------------"
echo "Connection details have been saved to .env.production"
echo "You can now deploy your application with: ./deploy-cloud-run.sh -p"
echo "-------------------------------------------------"

# Disable debug logging
set +x

echo "Script completed successfully!" 