# VibeSmiths - Spotify Track Importer

A progressive web application that allows users to import their liked tracks from Spotify and store them in a database.

## Features

- **Spotify Authentication**: Securely authenticate with your Spotify account
- **Import Liked Tracks**: Import all your liked tracks from Spotify
- **Mobile-Friendly Design**: Optimized for mobile devices
- **PWA Support**: Install as a native app on your device

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Authentication**: NextAuth.js with Spotify OAuth
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Google Cloud Run

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database
- Spotify Developer Account

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/vibesmith.git
cd vibesmith
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following variables:

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vibesmith?schema=public

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Node Environment
NODE_ENV=development
```

4. Create a Spotify Application:

   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new application
   - Add `http://localhost:3000/api/auth/callback/spotify` as a Redirect URI
   - Copy the Client ID and Client Secret to your `.env` file

5. Set up the database:

```bash
npx prisma migrate dev --name init
```

6. Run the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment to Google Cloud Run

This application can be deployed to Google Cloud Run with a PostgreSQL database in Cloud SQL. The deployment process is automated with a single script that handles everything from setting up the database to deploying the application.

### Prerequisites

1. Install the Google Cloud SDK:
   ```bash
   # For macOS
   brew install google-cloud-sdk
   
   # For other platforms, see: https://cloud.google.com/sdk/docs/install
   ```

2. Log in to your Google Cloud account:
   ```bash
   gcloud auth login
   ```

3. Ensure you have Docker installed locally to build the container image.

4. Make sure you have a valid `.env` file with your Spotify API credentials.

### Deployment Process

Run the comprehensive deployment script:

```bash
./deploy.sh
```

This script will:

1. Verify GCP project and authentication
2. Enable all required Google Cloud APIs
3. Set up a Cloud SQL PostgreSQL database
4. Configure environment variables for production
5. Build and deploy the Docker image to Cloud Run
6. Apply Prisma migrations to the production database

The script includes detailed logging and error handling, with all logs saved to a timestamped log file for troubleshooting.

### Manual Deployment (if needed)

If you need more control over the deployment process, you can:

1. Set up the Cloud SQL database:
   ```bash
   # Enable required APIs
   gcloud services enable sqladmin.googleapis.com compute.googleapis.com
   
   # Create a Cloud SQL instance
   gcloud sql instances create vibesmith-db \
     --database-version=POSTGRES_14 \
     --tier=db-f1-micro \
     --region=us-central1
   
   # Create database and user
   gcloud sql databases create vibesmith --instance=vibesmith-db
   gcloud sql users create vibesmith-user --instance=vibesmith-db
   ```

2. Build and deploy the Docker image:
   ```bash
   # Build the image
   docker build -t gcr.io/vibesmith-456523/vibesmith:latest .
   
   # Push to Google Container Registry
   docker push gcr.io/vibesmith-456523/vibesmith:latest
   
   # Deploy to Cloud Run
   gcloud run deploy vibesmith \
     --image gcr.io/vibesmith-456523/vibesmith:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## Security Notes

- Never commit `.env` files to your repository
- Use `.env.example` as a template for required variables
- When setting up CI/CD, store secrets in Google Secret Manager or similar service
- Rotate secrets periodically, especially for production deployments

## License

This project is licensed under the MIT License - see the LICENSE file for details.
