
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
      { // ADD THIS ENTRY BACK AND ENSURE THE PATHNAME IS CORRECT
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        // The pathname must match the structure of your image URLs.
        // Based on your error: "https://storage.googleapis.com/cariera-9ba32.firebasestorage.app/store-logos/..."
        // The pathname needs to start with your bucket's name as a segment.
        pathname: '/cariera-9ba32.firebasestorage.app/**', 
      },
      { 
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/cariera-9ba32.appspot.com/o/**',
      }
    ],
  },
  reactStrictMode: false, 
};

export default nextConfig;