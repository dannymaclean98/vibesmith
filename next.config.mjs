import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: [
      'i.scdn.co', // Allow Spotify image domain
      'scontent-ams4-1.xx.fbcdn.net', // Facebook CDN
      'platform-lookaside.fbsbx.com', // Facebook Platform
      'fbcdn.net', // Facebook CDN
      'fbsbx.com', // Facebook Storage
      'graph.facebook.com', // Facebook Graph API
      'scontent.xx.fbcdn.net', // Facebook CDN
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.a.run.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.xx.fbcdn.net',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'production', // Don't optimize images in production
  },
  // Make sure static assets are included in the output
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  eslint: {
    // Don't run ESLint during build for generated files
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Only show type errors in the browser overlay during development
    ignoreBuildErrors: true,
  },
};

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);

export default config; 