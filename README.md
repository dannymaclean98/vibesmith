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

1. Update the configuration in `deploy-cloud-run.sh` with your GCP project details

2. Make sure you have the Google Cloud SDK installed and configured

3. Create a PostgreSQL instance in Google Cloud SQL or use a managed PostgreSQL provider

4. Run the deployment script:

```bash
./deploy-cloud-run.sh
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
