
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
        pathname: '/cariera-9ba32.firebasestorage.app/**', 
      }
    ],
  },
  // You might also have experimental.allowedDevOrigins here if you added it earlier
  // For example:
  /*
  experimental: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1747039846284.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
      // Add any other origins your dev environment might use
    ],
  },
  */
};

export default nextConfig;