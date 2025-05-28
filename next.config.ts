// next.config.js
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        // THIS IS THE LINE THAT NEEDS THE FIX!
        // It must match your actual bucket name as seen in Google Cloud Storage.
        pathname: '/cariera-9ba32.firebasestorage.app/**', // Corrected pathname
      },
      { // Added this as Firebase Storage often uses this hostname
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/cariera-9ba32.appspot.com/o/**',
      }
    ],
  },
  // ADD THIS LINE TO DISABLE STRICT MODE FOR DEBUGGING
  reactStrictMode: false, 
};

export default nextConfig;