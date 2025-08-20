/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Disable React strict mode to reduce development warnings
  reactStrictMode: false,
  // Disable fast refresh error overlays
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'top-right',
  }
}

module.exports = nextConfig