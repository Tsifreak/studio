/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the entire 'experimental' block if 'allowedDevOrigins' was the only thing in it.
  // If you had other experimental options, keep the 'experimental' block
  // but remove *only* the 'allowedDevOrigins' line.
  // For simplicity, assuming 'allowedDevOrigins' was the only thing there:
  // experimental: {
  //   allowedDevOrigins: [
  //     "3000-firebase-studio-1747039846284.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev",
  //   ],
  // },

  // KEEP THE images CONFIG
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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Resolve Node.js modules to false for client-side bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        os: false,
        path: false,
        net: false,
        tls: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
        buffer: false,
        zlib: false,
        url: false,
        assert: false,
        constants: false,
        util: false,
        querystring: false,
        tty: false,
        events: false,
        vm: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
