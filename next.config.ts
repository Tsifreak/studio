
// next.config.js
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
        // Corrected pathname to match the standard Firebase bucket name
        pathname: '/cariera-9ba32.appspot.com/**', 
      },
      { 
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/cariera-9ba32.appspot.com/o/**', // This one is standard and correct
      }
    ],
  },
  // ADD THIS LINE TO DISABLE STRICT MODE FOR DEBUGGING
  reactStrictMode: false, 
};

export default nextConfig;
