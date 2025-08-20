/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Disable React strict mode to reduce development warnings
  reactStrictMode: false,
  // Disable all development indicators and overlays
  devIndicators: {
    buildActivity: false,
  },
  // Disable error overlays in development
  experimental: {
    appDir: true,
  },
  // Custom webpack configuration to disable overlays
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable the error overlay
      config.devtool = false
    }
    return config
  }
}

module.exports = nextConfig