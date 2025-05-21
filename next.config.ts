
import type {NextConfig} from 'next';
import type { Configuration as WebpackConfiguration } from 'webpack'; // Import Webpack type

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: { 
    allowedDevOrigins: [
      "3000-firebase-studio-1747039846284.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev",
    ],
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
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config: WebpackConfiguration, { isServer, webpack }) => {
    if (!isServer) {
      // Resolve Node.js modules to false for client-side bundles
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...(config.resolve?.fallback || {}), // Spread existing fallbacks if any
          child_process: false,
          fs: false,
          os: false,
          path: false, 
          net: false, 
          tls: false, 
        },
      };
    }
    return config;
  },
};

export default nextConfig;
