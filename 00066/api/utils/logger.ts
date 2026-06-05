const logger = {
  info: (message: string, data?: object): void => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : '')
  },
  
  error: (message: string, data?: object): void => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : '')
  },
  
  warn: (message: string, data?: object): void => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : '')
  },
  
  debug: (message: string, data?: object): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : '')
    }
  },
}

export default logger
