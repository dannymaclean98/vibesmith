#!/bin/bash
set -e

# Enable debug logging
set -x

# Configuration variables
PROJECT_ID="vibesmith-456523"

echo "Verifying GCP project and API status..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "gcloud could not be found. Please install the Google Cloud SDK."
    exit 1
fi

# Check if logged in
echo "Checking gcloud authentication..."
ACCOUNT=$(gcloud config list account --format "value(core.account)")
if [ -z "$ACCOUNT" ]; then
    echo "Not logged in to gcloud. Please run 'gcloud auth login' first."
    exit 1
else
    echo "Authenticated as: $ACCOUNT"
fi

# Check project access
echo "Verifying access to project: $PROJECT_ID"
if ! gcloud projects describe $PROJECT_ID --format="value(projectId)" &>/dev/null; then
    echo "ERROR: Cannot access project $PROJECT_ID"
    echo "Please check if the project exists and you have access to it."
    exit 1
else
    echo "Project access verified: $PROJECT_ID"
fi

# Check if billing is enabled
echo "Checking if billing is enabled..."
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "UNKNOWN")
if [ "$BILLING_ENABLED" = "UNKNOWN" ]; then
    echo "WARNING: Could not determine billing status. You may not have billing admin permissions."
else
    if [ "$BILLING_ENABLED" = "true" ]; then
        echo "Billing is enabled for the project."
    else
        echo "ERROR: Billing is NOT enabled for the project. Cloud SQL requires billing to be enabled."
        exit 1
    fi
fi

# List of required APIs
REQUIRED_APIS=(
    "sqladmin.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "serviceusage.googleapis.com"
    "compute.googleapis.com"
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
)

# Check each API
echo "Checking status of required APIs..."
for api in "${REQUIRED_APIS[@]}"; do
    echo "Checking API: $api"
    API_STATUS=$(gcloud services list --project=$PROJECT_ID --filter="name:${api}" --format="value(state)" 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$API_STATUS" = "ENABLED" ]; then
        echo "  ✅ $api is enabled"
    elif [ "$API_STATUS" = "NOT_FOUND" ]; then
        echo "  ❌ $api is not enabled or accessible"
        echo "     To enable: gcloud services enable $api --project=$PROJECT_ID"
    else
        echo "  ❓ $api status: $API_STATUS"
    fi
done

# Check Cloud SQL Admin API specifically
echo "Checking Cloud SQL Admin API permissions..."
if gcloud sql instances list --project=$PROJECT_ID &>/dev/null; then
    echo "✅ Successfully accessed Cloud SQL API"
else
    echo "❌ Cannot access Cloud SQL API. This might be why the setup script hangs."
fi

# Disable debug logging
set +x

echo "Verification completed. Please check the results above for any issues." 