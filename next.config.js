/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Disable React strict mode to reduce development warnings
  reactStrictMode: false,
  // Custom webpack configuration
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable devtool for cleaner development
      config.devtool = false
      
      // Disable error overlay by removing the plugin
      config.plugins = config.plugins.filter(plugin => {
        return ![
          'ReactRefreshWebpackPlugin',
          'NextJsRequireCacheHotReloader',
          'UnusedFilesWebpackPlugin',
          'BuildManifestPlugin'
        ].includes(plugin.constructor.name)
      })
      
      // Override client entry to disable overlays
      if (config.entry) {
        const originalEntry = config.entry
        config.entry = async () => {
          const entries = await originalEntry()
          // Remove error overlay entries
          Object.keys(entries).forEach(key => {
            if (Array.isArray(entries[key])) {
              entries[key] = entries[key].filter(entry => 
                !entry.includes('error-overlay') && 
                !entry.includes('webpack-hot-middleware') &&
                !entry.includes('react-refresh')
              )
            }
          })
          return entries
        }
      }
    }
    return config
  }
}

module.exports = nextConfig