#!/bin/bash
set -e

# Configuration variables
PROJECT_ID="vibesmith-456523"
INSTANCE_NAME="vibesmith-db"
DB_NAME="vibesmith"
DB_USER="vibesmith-user"
REGION="us-central1"

echo "Setting up Cloud SQL prerequisites..."

# Step 1: Verify authentication
echo "Step 1: Verifying gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "Error: Not authenticated with gcloud. Please run 'gcloud auth login' first."
    exit 1
fi

# Step 2: Enable required APIs
echo "Step 2: Enabling required APIs..."
echo "This might take a minute or two..."

APIS_TO_ENABLE=(
    "sqladmin.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "serviceusage.googleapis.com"
    "compute.googleapis.com"
)

for api in "${APIS_TO_ENABLE[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID
done

echo "Required APIs enabled successfully."

# Step 3: Verify access to Cloud SQL Admin API
echo "Step 3: Verifying access to Cloud SQL Admin API..."
if ! gcloud sql instances list --project=$PROJECT_ID &>/dev/null; then
    echo "Error accessing Cloud SQL Admin API. Please check your permissions."
    echo "Your account needs the 'Cloud SQL Admin' role or equivalent."
    exit 1
fi

echo "Cloud SQL Admin API access verified."

echo "Prerequisites setup completed successfully."
echo ""
echo "You can now run the full setup script: ./setup-cloud-sql.sh"
echo "or try to create a Cloud SQL instance with this simpler command:"
echo "gcloud sql instances create $INSTANCE_NAME --project=$PROJECT_ID --region=$REGION --tier=db-f1-micro" 