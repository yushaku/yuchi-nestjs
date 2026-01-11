// Global setup for e2e tests
// This runs before all tests

// Set default test environment variables if not provided
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
