// Redis configuration - completely optional
// If Redis is not available, the app will use in-memory fallback

let client = null;
let isAvailable = false;

// Try to connect to Redis
const connectRedis = async () => {
  // Skip if already connected
  if (client && client.isReady) {
    return true;
  }
  
  // Skip if Redis URL not set
  if (!process.env.REDIS_URL && !process.env.USE_REDIS) {
    console.log('ℹ️  Redis not configured, using in-memory storage');
    return false;
  }
  
  try {
    const { createClient } = require('redis');
    
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          // Stop trying after 3 attempts
          if (retries > 2) {
            console.log('⚠️  Redis connection failed, using in-memory fallback');
            return false;
          }
          return Math.min(retries * 100, 500);
        }
      }
    });

    client.on('error', (err) => {
      // Silent error
    });

    client.on('connect', () => {
      console.log('✅ Redis connected');
      isAvailable = true;
    });

    await client.connect();
    isAvailable = true;
    return true;
  } catch (error) {
    console.log('⚠️  Redis not available, using in-memory fallback');
    console.log('   To enable Redis: docker run -d -p 6379:6379 redis:7-alpine');
    client = null;
    isAvailable = false;
    return false;
  }
};

// Graceful shutdown
const disconnectRedis = async () => {
  try {
    if (client) {
      await client.quit();
    }
  } catch (error) {
    // Silent
  }
};

// Auto-connect on module load (don't wait for it)
connectRedis().then(connected => {
  if (connected) {
    console.log('✅ Redis session storage ready');
  }
});

module.exports = {
  get client() { return client; },
  get isAvailable() { return isAvailable && client && client.isReady; },
  connectRedis,
  disconnectRedis
};
