/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Disable debugging and error overlays
  reactStrictMode: false,
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Disable webpack bundle analyzer in development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable source maps in development to reduce overhead
      config.devtool = false;
      
      // Reduce noise from webpack
      config.stats = 'errors-warnings';
    }
    return config;
  },
  // Reduce compilation noise
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Disable fast refresh error overlay
  experimental: {
    forceSwcTransforms: true,
  },
}

module.exports = nextConfig