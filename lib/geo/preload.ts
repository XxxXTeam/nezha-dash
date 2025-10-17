/**
 * GeoIP Database Preloader
 * Loads the chunked database at application startup
 */

import path from "node:path"
import { hasChunkedDatabase, loadGeoIPFromChunks } from "./chunked-loader"

let isPreloaded = false
let preloadPromise: Promise<void> | null = null

/**
 * Preload GeoIP database at application startup
 * This ensures the chunked database is loaded before any API calls
 */
export async function preloadGeoIPDatabase(): Promise<void> {
  // Prevent multiple simultaneous preloads
  if (isPreloaded) {
    console.log("✅ [GeoIP] Database already preloaded")
    return
  }

  if (preloadPromise) {
    console.log("⏳ [GeoIP] Waiting for preload to complete...")
    return preloadPromise
  }

  preloadPromise = (async () => {
    try {
      const chunksDir = path.join(process.cwd(), "lib", "maxmind-db", "chunks")

      // Check if chunked database exists
      if (hasChunkedDatabase(chunksDir)) {
        const startTime = Date.now()
        console.log("🚀 [GeoIP] Preloading chunked database...")

        // Load the database
        await loadGeoIPFromChunks(chunksDir)

        const loadTime = Date.now() - startTime
        console.log(`✅ [GeoIP] Database preloaded in ${loadTime}ms`)
        console.log("📊 [GeoIP] Using chunked database (12 chunks, ~30MB compressed)")

        isPreloaded = true
      } else {
        console.log("ℹ️  [GeoIP] No chunked database found, will use regular .mmdb file")
      }
    } catch (error) {
      console.error("❌ [GeoIP] Failed to preload database:", error)
      // Don't throw - allow app to start even if preload fails
      // It will fallback to loading on-demand
    } finally {
      preloadPromise = null
    }
  })()

  return preloadPromise
}

/**
 * Check if database is preloaded
 */
export function isGeoIPPreloaded(): boolean {
  return isPreloaded
}

