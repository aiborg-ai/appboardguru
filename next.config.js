/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Disable React strict mode to reduce development warnings
  reactStrictMode: false,
  // Disable error overlays and development indicators
  onDemandEntries: {
    // Keep pages in memory for longer to avoid rebuilds
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}

module.exports = nextConfig