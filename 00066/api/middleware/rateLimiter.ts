import rateLimit from 'express-rate-limit'
import config from '../config/index'

const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Rate limit exceeded for this endpoint',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export { limiter, strictLimiter }
export default limiter
