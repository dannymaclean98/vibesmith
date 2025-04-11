#!/bin/bash

# Configuration variables - replace these with your actual values
PROJECT_ID="your-gcp-project-id"
SERVICE_NAME="vibesmith"
REGION="us-central1"
DB_INSTANCE="vibesmith-db"
DB_NAME="vibesmith"
DB_USER="vibesmith-user"

# Make script executable
chmod +x ./deploy-cloud-run.sh

# Build the Docker image
echo "Building Docker image..."
IMAGE_URL="gcr.io/$PROJECT_ID/$SERVICE_NAME"
docker build -t $IMAGE_URL .

# Push the image to Google Container Registry
echo "Pushing image to GCR..."
docker push $IMAGE_URL

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --update-env-vars DATABASE_URL="postgresql://$DB_USER:${DB_PASSWORD}@${DB_HOST}:5432/$DB_NAME" \
  --update-env-vars SPOTIFY_CLIENT_ID="$SPOTIFY_CLIENT_ID" \
  --update-env-vars SPOTIFY_CLIENT_SECRET="$SPOTIFY_CLIENT_SECRET" \
  --update-env-vars NEXTAUTH_URL="https://$SERVICE_NAME-$PROJECT_HASH.run.app" \
  --update-env-vars NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

# Get the deployed URL
echo "Getting the deployed URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "Your app is deployed at: $SERVICE_URL" 