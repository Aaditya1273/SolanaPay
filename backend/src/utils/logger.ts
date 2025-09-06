// Simple console logger to avoid winston dependency issues
const logger = {
  info: (message: any) => {
    console.log(`[INFO] ${new Date().toISOString()}:`, typeof message === 'object' ? JSON.stringify(message, null, 2) : message)
  },
  error: (message: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, typeof message === 'object' ? JSON.stringify(message, null, 2) : message)
  },
  warn: (message: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}:`, typeof message === 'object' ? JSON.stringify(message, null, 2) : message)
  },
  debug: (message: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()}:`, typeof message === 'object' ? JSON.stringify(message, null, 2) : message)
    }
  }
}

export default logger
