const fs = require('fs');
const path = require('path');

/**
 * Webpack Build Performance Monitor
 * Analyzes webpack cache and build performance
 */

class WebpackMonitor {
  constructor() {
    this.cacheDir = path.join(process.cwd(), '.next', 'cache', 'webpack');
    this.prodCacheDir = path.join(process.cwd(), '.next', 'cache', 'webpack-prod');
  }

  // Get directory size
  getDirSize(dir) {
    let size = 0;
    try {
      if (!fs.existsSync(dir)) return 0;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          size += this.getDirSize(filePath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
    return size;
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check cache health
  checkCacheHealth() {
    console.log('🔍 Webpack Cache Analysis\n');
    console.log('=' .repeat(50));
    
    // Check development cache
    if (fs.existsSync(this.cacheDir)) {
      const devSize = this.getDirSize(this.cacheDir);
      console.log(`📦 Development Cache: ${this.formatBytes(devSize)}`);
      
      // Check for corruption
      try {
        const files = fs.readdirSync(this.cacheDir);
        const packFiles = files.filter(f => f.endsWith('.pack'));
        console.log(`   Pack files: ${packFiles.length}`);
        
        // Check for old files (older than 7 days)
        const now = Date.now();
        let oldFiles = 0;
        for (const file of files) {
          const filePath = path.join(this.cacheDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;
          if (age > 7 * 24 * 60 * 60 * 1000) {
            oldFiles++;
          }
        }
        if (oldFiles > 0) {
          console.log(`   ⚠️  Old files (>7 days): ${oldFiles}`);
        }
      } catch (error) {
        console.log(`   ❌ Error reading cache: ${error.message}`);
      }
    } else {
      console.log('📦 Development Cache: Not found');
    }
    
    // Check production cache
    if (fs.existsSync(this.prodCacheDir)) {
      const prodSize = this.getDirSize(this.prodCacheDir);
      console.log(`📦 Production Cache: ${this.formatBytes(prodSize)}`);
    } else {
      console.log('📦 Production Cache: Not found');
    }
    
    // Check .next directory
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
      const nextSize = this.getDirSize(nextDir);
      console.log(`📂 .next Directory: ${this.formatBytes(nextSize)}`);
      
      // Check for build artifacts
      const buildId = path.join(nextDir, 'BUILD_ID');
      if (fs.existsSync(buildId)) {
        const id = fs.readFileSync(buildId, 'utf8').trim();
        console.log(`   Build ID: ${id}`);
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('\n📊 Recommendations:\n');
    
    // Provide recommendations
    const devSize = fs.existsSync(this.cacheDir) ? this.getDirSize(this.cacheDir) : 0;
    const prodSize = fs.existsSync(this.prodCacheDir) ? this.getDirSize(this.prodCacheDir) : 0;
    
    if (devSize > 500 * 1024 * 1024) { // 500MB
      console.log('⚠️  Development cache is large. Consider running: npm run clean:cache');
    }
    
    if (prodSize > 1024 * 1024 * 1024) { // 1GB
      console.log('⚠️  Production cache is very large. Consider cleaning.');
    }
    
    if (!fs.existsSync(this.cacheDir) && !fs.existsSync(this.prodCacheDir)) {
      console.log('ℹ️  No cache found. This is normal for fresh builds.');
    } else {
      console.log('✅ Cache appears healthy.');
    }
    
    // Check permissions
    try {
      if (fs.existsSync(this.cacheDir)) {
        fs.accessSync(this.cacheDir, fs.constants.W_OK);
      }
      console.log('✅ Cache permissions are correct.');
    } catch (error) {
      console.log('❌ Cache permission issues detected. Run: sudo chmod -R 755 .next');
    }
  }

  // Monitor build process
  monitorBuild() {
    console.log('\n📈 Build Performance Tips:\n');
    console.log('1. Use "npm run dev" with the optimized webpack config');
    console.log('2. Clear cache if builds are slow: npm run clean:cache');
    console.log('3. Monitor memory usage: watch -n 1 "ps aux | grep node"');
    console.log('4. Check for large dependencies: npm ls --depth=0');
    console.log('5. Use production builds for deployment: npm run build');
  }
}

// Run the monitor
const monitor = new WebpackMonitor();
monitor.checkCacheHealth();
monitor.monitorBuild();