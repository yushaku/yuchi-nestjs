// Global setup for e2e tests
// This runs before all tests

// Load .env.test file if it exists
import { config } from 'dotenv'
import { resolve } from 'path'

// Try to load .env.test file
const envTestPath = resolve(process.cwd(), '.env.test')
config({ path: envTestPath })

// Set default test environment variables if not provided
// Database URL - prefer DATABASE_URL_TEST for tests, fallback to DATABASE_URL
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST
} else if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL or DATABASE_URL_TEST must be set for e2e tests. ' +
      'Set DATABASE_URL_TEST for a separate test database, or DATABASE_URL to use the same database.',
  )
}

// Helper to mask database URL for logging
function maskDatabaseUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    if (urlObj.password) {
      urlObj.password = '***'
    }
    return urlObj.toString()
  } catch {
    const parts = url.split('@')
    if (parts.length === 2) {
      return parts[0].split(':')[0] + ':***@' + parts[1]
    }
    return url.replace(/:[^:@]+@/, ':***@')
  }
}

// Log which database URL is being used (for debugging)
if (process.env.NODE_ENV !== 'production') {
  const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL || '')
  console.log(`[E2E Test Setup] Using database: ${maskedUrl}`)
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key'
}
if (!process.env.JWT_EXPIRED_TIME) {
  process.env.JWT_EXPIRED_TIME = '1h'
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key'
}
if (!process.env.JWT_REFRESH_EXPIRED_TIME) {
  process.env.JWT_REFRESH_EXPIRED_TIME = '7d'
}
if (!process.env.COOKIE_SECRET) {
  process.env.COOKIE_SECRET = 'test-cookie-secret'
}
if (!process.env.GOOGLE_CLIENT_ID) {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
}
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = 'localhost'
}
if (!process.env.REDIS_PORT) {
  process.env.REDIS_PORT = '6379'
}
if (!process.env.THROTTLE_LIMIT) {
  process.env.THROTTLE_LIMIT = '100'
}
if (!process.env.THROTTLE_TTL) {
  process.env.THROTTLE_TTL = '60'
}

beforeAll(async () => {
  // Global setup before all tests
  // Database cleanup is handled in individual test files
})

afterAll(async () => {
  // Global cleanup after all tests
})
