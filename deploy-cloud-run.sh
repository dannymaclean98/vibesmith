#!/bin/bash
set -x

# -------------------------------------------------------------------------
# VIBESMITH CLOUD RUN DEPLOYMENT SCRIPT
# -------------------------------------------------------------------------
# Deploys the Vibesmith app to Google Cloud Run with:
# - Cloud SQL PostgreSQL database
# - Secrets from GCP Secret Manager
# - VPC connector for database access
# -------------------------------------------------------------------------

# Configuration
PROJECT_ID="vibesmith-456523"
SERVICE_NAME="vibesmith"
REGION="us-central1"
VPC_CONNECTOR_NAME="${SERVICE_NAME}-connector"

# Logging
LOG_FILE="deploy-$(date +%Y%m%d-%H%M%S).log"

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

# -------------------------------------------------------------------------
# STEP 1: Verify Prerequisites
# -------------------------------------------------------------------------
log "header" "VERIFYING PREREQUISITES"

# Check gcloud
if ! command -v gcloud &> /dev/null; then
  log "error" "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check docker
if ! command -v docker &> /dev/null; then
  log "error" "docker not found. Please install Docker."
  exit 1
fi

# Check authentication
ACCOUNT=$(gcloud config list account --format "value(core.account)" 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
  log "error" "Not logged in to gcloud. Run: gcloud auth login"
  exit 1
fi
log "success" "Authenticated as: $ACCOUNT"

# Verify project access
if ! gcloud projects describe $PROJECT_ID --format="value(projectId)" &>/dev/null; then
  log "error" "Cannot access project $PROJECT_ID"
  exit 1
fi
log "success" "Project verified: $PROJECT_ID"

# -------------------------------------------------------------------------
# STEP 2: Verify Secrets Exist
# -------------------------------------------------------------------------
log "header" "VERIFYING SECRETS"

REQUIRED_SECRETS=("database-url" "twilio-account-sid" "twilio-auth-token" "twilio-verify-service-sid")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
  if ! gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
    MISSING_SECRETS+=($secret)
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  log "error" "Missing secrets in Secret Manager:"
  for secret in "${MISSING_SECRETS[@]}"; do
    log "error" "  - $secret"
  done
  log "info" "Create secrets with:"
  log "info" "  gcloud secrets create SECRET_NAME --project=$PROJECT_ID"
  log "info" "  echo -n 'VALUE' | gcloud secrets versions add SECRET_NAME --data-file=-"
  exit 1
fi
log "success" "All required secrets exist"

# -------------------------------------------------------------------------
# STEP 3: Ensure VPC Connector Exists
# -------------------------------------------------------------------------
log "header" "CHECKING VPC CONNECTOR"

if ! gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
  log "info" "Creating VPC connector $VPC_CONNECTOR_NAME..."
  if gcloud compute networks vpc-access connectors create $VPC_CONNECTOR_NAME \
    --region=$REGION \
    --network=default \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=3 \
    --project=$PROJECT_ID \
    >> $LOG_FILE 2>&1; then
    log "success" "VPC connector created"
  else
    log "error" "Failed to create VPC connector. Check $LOG_FILE"
    exit 1
  fi
else
  log "success" "VPC connector exists: $VPC_CONNECTOR_NAME"
fi

# -------------------------------------------------------------------------
# STEP 4: Build and Push Docker Image
# -------------------------------------------------------------------------
log "header" "BUILDING DOCKER IMAGE"

IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_URL="gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG"

log "info" "Building image: $IMAGE_URL"
if docker buildx build --platform linux/amd64 -t $IMAGE_URL . >> $LOG_FILE 2>&1; then
  log "success" "Image built successfully"
else
  log "error" "Docker build failed. Check $LOG_FILE"
  exit 1
fi

log "info" "Pushing to Google Container Registry..."
if docker push $IMAGE_URL >> $LOG_FILE 2>&1; then
  log "success" "Image pushed successfully"
else
  log "error" "Docker push failed. Check $LOG_FILE"
  exit 1
fi

# -------------------------------------------------------------------------
# STEP 5: Deploy to Cloud Run
# -------------------------------------------------------------------------
log "header" "DEPLOYING TO CLOUD RUN"

log "info" "Deploying service..."
if gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --vpc-connector $VPC_CONNECTOR_NAME \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "DATABASE_URL=database-url:latest" \
  --set-secrets "TWILIO_ACCOUNT_SID=twilio-account-sid:latest" \
  --set-secrets "TWILIO_AUTH_TOKEN=twilio-auth-token:latest" \
  --set-secrets "TWILIO_VERIFY_SERVICE_SID=twilio-verify-service-sid:latest" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  >> $LOG_FILE 2>&1; then
  log "success" "Deployment successful"
else
  log "error" "Deployment failed. Check $LOG_FILE"
  exit 1
fi

# -------------------------------------------------------------------------
# STEP 6: Get Deployed URL
# -------------------------------------------------------------------------
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null)

# -------------------------------------------------------------------------
# DEPLOYMENT SUMMARY
# -------------------------------------------------------------------------
log "header" "DEPLOYMENT COMPLETE"
log "success" "Application URL: $SERVICE_URL"
log "info" "Image: $IMAGE_URL"
log "info" "Logs saved to: $LOG_FILE"

echo ""
echo "🎉 Deployment completed successfully!"
echo "Access your application at: $SERVICE_URL"
