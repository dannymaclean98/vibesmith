#!/bin/bash
set -x

# -------------------------------------------------------------------------
# VIBESMITH SECRET MANAGER SETUP
# -------------------------------------------------------------------------
# One-time setup script to create secrets in GCP Secret Manager
# Run this before your first deployment.
# -------------------------------------------------------------------------

PROJECT_ID="vibesmith-456523"

echo "=============================================="
echo "VIBESMITH SECRET MANAGER SETUP"
echo "=============================================="
echo ""

# Check gcloud auth
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
  echo "ERROR: Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

echo "Project: $PROJECT_ID"
echo ""

# -------------------------------------------------------------------------
# Create Secrets
# -------------------------------------------------------------------------
echo "Creating secrets in Secret Manager..."

SECRETS=("database-url" "twilio-account-sid" "twilio-auth-token" "twilio-verify-service-sid")

for secret in "${SECRETS[@]}"; do
  if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
    echo "  ✓ Secret '$secret' already exists"
  else
    echo "  Creating secret: $secret"
    gcloud secrets create $secret --project=$PROJECT_ID
  fi
done

echo ""

# -------------------------------------------------------------------------
# Add Secret Values
# -------------------------------------------------------------------------
echo "=============================================="
echo "ADD SECRET VALUES"
echo "=============================================="
echo ""
echo "Now add values to each secret. You'll be prompted for each one."
echo ""

# Database URL
echo "1. DATABASE_URL (full PostgreSQL connection string)"
echo "   Format: postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
echo ""
read -p "   Enter DATABASE_URL (or press Enter to skip): " DB_URL
if [ -n "$DB_URL" ]; then
  echo -n "$DB_URL" | gcloud secrets versions add database-url --data-file=- --project=$PROJECT_ID
  echo "   ✓ database-url secret updated"
fi
echo ""

# Twilio Account SID
echo "2. TWILIO_ACCOUNT_SID"
read -p "   Enter Twilio Account SID (or press Enter to skip): " TWILIO_SID
if [ -n "$TWILIO_SID" ]; then
  echo -n "$TWILIO_SID" | gcloud secrets versions add twilio-account-sid --data-file=- --project=$PROJECT_ID
  echo "   ✓ twilio-account-sid secret updated"
fi
echo ""

# Twilio Auth Token
echo "3. TWILIO_AUTH_TOKEN"
read -p "   Enter Twilio Auth Token (or press Enter to skip): " TWILIO_TOKEN
if [ -n "$TWILIO_TOKEN" ]; then
  echo -n "$TWILIO_TOKEN" | gcloud secrets versions add twilio-auth-token --data-file=- --project=$PROJECT_ID
  echo "   ✓ twilio-auth-token secret updated"
fi
echo ""

# Twilio Verify Service SID
echo "4. TWILIO_VERIFY_SERVICE_SID"
read -p "   Enter Twilio Verify Service SID (or press Enter to skip): " VERIFY_SID
if [ -n "$VERIFY_SID" ]; then
  echo -n "$VERIFY_SID" | gcloud secrets versions add twilio-verify-service-sid --data-file=- --project=$PROJECT_ID
  echo "   ✓ twilio-verify-service-sid secret updated"
fi
echo ""

# -------------------------------------------------------------------------
# Grant Cloud Run Access to Secrets
# -------------------------------------------------------------------------
echo "=============================================="
echo "GRANTING SECRET ACCESS TO CLOUD RUN"
echo "=============================================="

PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Service Account: $SA"
echo ""

for secret in "${SECRETS[@]}"; do
  echo "  Granting access to: $secret"
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID \
    --quiet
done

echo ""
echo "=============================================="
echo "SETUP COMPLETE"
echo "=============================================="
echo ""
echo "All secrets have been created and permissions granted."
echo "You can now run: ./deploy-cloud-run.sh"
echo ""

