#!/bin/bash
set -e

# Function to print help information
function print_help {
  echo "Usage: ./deploy-cloud-run.sh [-p]"
  echo "  -p: Use production environment file (.env.production)"
  echo "  -h: Show this help message"
}

# Add an option to use the production environment file
ENV_FILE=".env"
while getopts "ph" opt; do
  case $opt in
    p) ENV_FILE=".env.production"
       ;;
    h) print_help
       exit 0
       ;;
    \?) echo "Invalid option -$OPTARG" >&2
       print_help
       exit 1
       ;;
  esac
done

# Configuration variables
PROJECT_ID="vibesmith-456523"
SERVICE_NAME="vibesmith"
REGION="us-central1"
DB_INSTANCE="vibesmith-db"
DB_NAME="vibesmith"
DB_USER="vibesmith-user"

# Source environment variables from environment file
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE..."
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "Error: $ENV_FILE file not found"
  exit 1
fi

# Check for required environment variables
if [ -z "$SPOTIFY_CLIENT_ID" ] || [ -z "$SPOTIFY_CLIENT_SECRET" ] || [ -z "$NEXTAUTH_SECRET" ]; then
  echo "Error: Required environment variables not set"
  echo "Make sure SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and NEXTAUTH_SECRET are defined in your $ENV_FILE file"
  exit 1
fi

if [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ]; then
  echo "Error: Database credentials not set"
  echo "Make sure DB_PASSWORD and DB_HOST are defined in your $ENV_FILE file"
  exit 1
fi

# Build the Docker image
echo "Building Docker image..."
IMAGE_URL="gcr.io/$PROJECT_ID/$SERVICE_NAME:$(date +%Y%m%d-%H%M%S)"
docker build -t $IMAGE_URL .

# Push the image to Google Container Registry
echo "Pushing image to GCR..."
docker push $IMAGE_URL

# Get service URL base for NEXTAUTH_URL
NEXTAUTH_URL_BASE=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null || echo "https://$SERVICE_NAME-placeholder.run.app")

# Deploy to Cloud Run with secrets from environment variables
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" \
  --set-env-vars SPOTIFY_CLIENT_ID="$SPOTIFY_CLIENT_ID" \
  --set-env-vars SPOTIFY_CLIENT_SECRET="$SPOTIFY_CLIENT_SECRET" \
  --set-env-vars NEXTAUTH_URL="$NEXTAUTH_URL_BASE" \
  --set-env-vars NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  --set-env-vars NODE_ENV="production"

# Get the deployed URL
echo "Getting the deployed URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "Your app is deployed at: $SERVICE_URL"

# Clean up environment variables
unset SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET NEXTAUTH_SECRET DB_PASSWORD DB_HOST

echo "Deployment completed successfully!" 