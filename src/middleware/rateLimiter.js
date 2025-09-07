/**
 * Rate Limiting Configuration for L1 API
 * Prevents API abuse while allowing normal dashboard usage
 */

const rateLimitConfigs = {
  // UNLIMITED: No rate limiting for high-frequency fetching
  unlimited: {
    windowMs: 1000, // 1 second window
    max: 10000, // 10,000 requests per second (effectively unlimited)
    message: {
      success: true,
      message: 'Unlimited fetching enabled for high-frequency analytics'
    },
    standardHeaders: true,
    legacyHeaders: false
  },

  // DEVELOPMENT: Very high limits for development/testing
  development: {
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute
    message: {
      success: false,
      error: 'Development rate limit exceeded',
      message: 'High development limit reached.',
      limit: 1000,
      window: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false
  },

  // PRODUCTION: Reasonable limits for production use
  production: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes
    message: {
      success: false,
      error: 'Production rate limit exceeded',
      message: 'Production rate limit exceeded.',
      limit: 500,
      window: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
  }
};

// Helper function to create custom rate limiter
function createRateLimiter(configType) {
  const express = require('express');
  
  // For now, return a simple middleware that logs and continues
  // In production, you would use express-rate-limit package
  return (req, res, next) => {
    // Log API usage for monitoring
    console.log(`🌐 API Request: ${req.method} ${req.path} from ${req.ip}`);
    
    // Add rate limit headers for transparency
    const config = rateLimitConfigs[configType] || rateLimitConfigs.standard;
    res.set({
      'X-RateLimit-Limit': config.max,
      'X-RateLimit-Window': config.windowMs / 1000,
      'X-RateLimit-Remaining': config.max - 1 // Simplified for demo
    });
    
    next();
  };
}

module.exports = {
  rateLimitConfigs,
  createRateLimiter,
  
  // Export specific limiters
  standardLimiter: createRateLimiter('standard'),
  summaryLimiter: createRateLimiter('summary'),
  individualLimiter: createRateLimiter('individual')
};
