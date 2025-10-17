/**
 * Next.js Instrumentation Hook
 * This file runs once when the server starts
 * Perfect for preloading the chunked GeoIP database
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only run on Node.js runtime (not Edge)
    const { preloadGeoIPDatabase } = await import("./lib/geo/preload")
    await preloadGeoIPDatabase()
  }
}

