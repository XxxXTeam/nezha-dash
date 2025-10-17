import fs from "node:fs"
import path from "node:path"
import { type CityResponse, Reader } from "maxmind"
import { hasChunkedDatabase, loadGeoIPFromChunks } from "./chunked-loader"

// IPInfo database response type
interface IPInfoResponse {
  country?: string
  country_name?: string
}

let geoIPReader: Reader<CityResponse> | Reader<any> | null = null
let databaseType: "maxmind" | "ipinfo" = "maxmind"
let isInitializing = false
let initPromise: Promise<Reader<any>> | null = null

// IP to Country Code cache (LRU cache with 10000 entries max)
const ipCountryCache = new Map<string, string | null>()
const MAX_CACHE_SIZE = 10000

/**
 * Detect database type by checking available files
 * Priority: Chunked > IPInfo > MaxMind
 */
function detectDatabaseType(): { path: string; type: "maxmind" | "ipinfo"; chunked: boolean } {
  const basePath = path.join(process.cwd(), "lib", "maxmind-db")
  
  // Check for chunked database (highest priority)
  const chunksDir = path.join(basePath, "chunks")
  if (hasChunkedDatabase(chunksDir)) {
    return { path: chunksDir, type: "maxmind", chunked: true }
  }
  
  // Check for IPInfo databases
  const ipinfoCountry = path.join(basePath, "country.mmdb")
  const ipinfoLite = path.join(basePath, "ipinfo_lite.mmdb")
  
  // Check for MaxMind databases
  const maxmindCity = path.join(basePath, "GeoLite2-City.mmdb")
  
  if (fs.existsSync(ipinfoCountry)) {
    return { path: ipinfoCountry, type: "ipinfo", chunked: false }
  }
  
  if (fs.existsSync(ipinfoLite)) {
    return { path: ipinfoLite, type: "ipinfo", chunked: false }
  }
  
  if (fs.existsSync(maxmindCity)) {
    return { path: maxmindCity, type: "maxmind", chunked: false }
  }
  
  throw new Error("No GeoIP database found. Please add country.mmdb, ipinfo_lite.mmdb, or GeoLite2-City.mmdb to lib/maxmind-db/")
}

/**
 * Initialize GeoIP database reader (async for chunked databases)
 */
async function initGeoIPReaderAsync(): Promise<Reader<any>> {
  if (geoIPReader) {
    return geoIPReader
  }

  // Prevent multiple simultaneous initializations
  if (isInitializing && initPromise) {
    return initPromise
  }

  isInitializing = true
  
  initPromise = (async () => {
    try {
      const { path: dbPath, type, chunked } = detectDatabaseType()
      
      if (chunked) {
        // Load from compressed chunks
        geoIPReader = await loadGeoIPFromChunks(dbPath)
        databaseType = type
      } else {
        // Load regular file
        const dbBuffer = fs.readFileSync(dbPath)
        geoIPReader = new Reader<any>(dbBuffer)
        databaseType = type
      }
      
      isInitializing = false
      return geoIPReader
    } catch (error) {
      isInitializing = false
      initPromise = null
      throw error
    }
  })()
  
  return initPromise
}

/**
 * Synchronous wrapper for backward compatibility
 * Will use preloaded chunked database if available
 */
function initGeoIPReader(): Reader<any> {
  if (geoIPReader) {
    return geoIPReader
  }

  try {
    const { path: dbPath, type, chunked } = detectDatabaseType()
    
    if (chunked) {
      // Chunked database should have been preloaded at startup
      // If not preloaded yet, this will fail - that's intentional
      // to ensure we use the preload mechanism
      if (!geoIPReader) {
        throw new Error(
          "Chunked database detected but not preloaded. " +
          "The database should be loaded at application startup via instrumentation.ts"
        )
      }
      return geoIPReader
    }
    
    const dbBuffer = fs.readFileSync(dbPath)
    geoIPReader = new Reader<any>(dbBuffer)
    databaseType = type
    
    return geoIPReader
  } catch (error) {
    throw error
  }
}

/**
 * Extract country code from database result based on database type
 */
function extractCountryCode(result: CityResponse | IPInfoResponse | null): string | null {
  if (!result) {
    return null
  }
  
  if (databaseType === "ipinfo") {
    // IPInfo format: { country: "CN" }
    const ipinfoResult = result as IPInfoResponse
    return ipinfoResult.country || null
  } else {
    // MaxMind format: { country: { iso_code: "CN" } }
    const maxmindResult = result as CityResponse
    
    if (maxmindResult?.country?.iso_code) {
      return maxmindResult.country.iso_code
    }
    
    // Fallback to registered_country for some cases
    if (maxmindResult?.registered_country?.iso_code) {
      return maxmindResult.registered_country.iso_code
    }
  }
  
  return null
}

/**
 * Get country code from IP address using GeoIP database (async version)
 * Supports both MaxMind and IPInfo database formats
 * Results are cached to avoid repeated database queries
 * @param ip - IPv4 or IPv6 address
 * @returns ISO 3166-1 alpha-2 country code (e.g., "CN", "US") or null if not found
 */
export async function getCountryCodeFromIPAsync(ip: string): Promise<string | null> {
  if (!ip || ip === "" || ip === "::") {
    return null
  }

  // Check cache first
  if (ipCountryCache.has(ip)) {
    return ipCountryCache.get(ip) || null
  }

  try {
    const reader = await initGeoIPReaderAsync()
    const result = reader.get(ip)
    const countryCode = extractCountryCode(result)
    
    // Cache the result (even if null to avoid repeated lookups)
    if (ipCountryCache.size >= MAX_CACHE_SIZE) {
      // Simple LRU: remove oldest entry (first entry)
      const firstKey = ipCountryCache.keys().next().value
      if (firstKey) {
        ipCountryCache.delete(firstKey)
      }
    }
    ipCountryCache.set(ip, countryCode)
    
    return countryCode
  } catch (error) {
    return null
  }
}

/**
 * Get country code from IP address using GeoIP database (sync version)
 * Supports both MaxMind and IPInfo database formats
 * Results are cached to avoid repeated database queries
 * @param ip - IPv4 or IPv6 address
 * @returns ISO 3166-1 alpha-2 country code (e.g., "CN", "US") or null if not found
 */
export function getCountryCodeFromIP(ip: string): string | null {
  if (!ip || ip === "" || ip === "::") {
    return null
  }

  // Check cache first
  if (ipCountryCache.has(ip)) {
    return ipCountryCache.get(ip) || null
  }

  try {
    const reader = initGeoIPReader()
    const result = reader.get(ip)
    const countryCode = extractCountryCode(result)
    
    // Cache the result (even if null to avoid repeated lookups)
    if (ipCountryCache.size >= MAX_CACHE_SIZE) {
      // Simple LRU: remove oldest entry (first entry)
      const firstKey = ipCountryCache.keys().next().value
      if (firstKey) {
        ipCountryCache.delete(firstKey)
      }
    }
    ipCountryCache.set(ip, countryCode)
    
    return countryCode
  } catch (error) {
    return null
  }
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  return {
    size: ipCountryCache.size,
    maxSize: MAX_CACHE_SIZE,
  }
}

/**
 * Clear the IP country code cache
 */
export function clearCache() {
  ipCountryCache.clear()
}

/**
 * Get country code from server data
 * Tries to use IPv4 first, then falls back to IPv6
 * @param ipv4 - IPv4 address
 * @param ipv6 - IPv6 address
 * @returns ISO 3166-1 alpha-2 country code or null
 */
export function getCountryCodeFromServerIPs(ipv4?: string, ipv6?: string): string | null {
  // Try IPv4 first (more reliable for geolocation)
  if (ipv4 && ipv4 !== "") {
    const countryCode = getCountryCodeFromIP(ipv4)
    if (countryCode) {
      return countryCode
    }
  }

  // Fallback to IPv6
  if (ipv6 && ipv6 !== "" && ipv6 !== "::") {
    const countryCode = getCountryCodeFromIP(ipv6)
    if (countryCode) {
      return countryCode
    }
  }

  return null
}

