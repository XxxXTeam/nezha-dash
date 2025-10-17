#!/usr/bin/env node
/**
 * Test script for chunked GeoIP database loader
 */

const path = require('path')

async function test() {
  console.log('🧪 Testing Chunked GeoIP Loader\n')

  // Import the loader (using dynamic import for ESM)
  const { loadGeoIPFromChunks, hasChunkedDatabase, getChunkedMetadata } = await import(
    path.join(process.cwd(), 'lib/geo/chunked-loader.ts')
  )

  const chunksDir = path.join(process.cwd(), 'lib/maxmind-db/chunks')

  // Test 1: Check if chunks exist
  console.log('Test 1: Checking for chunked database...')
  const hasChunks = hasChunkedDatabase(chunksDir)
  console.log(`  ✅ Chunks exist: ${hasChunks}\n`)

  if (!hasChunks) {
    console.log('❌ No chunks found. Run: node scripts/split-geoip-db.js')
    process.exit(1)
  }

  // Test 2: Get metadata
  console.log('Test 2: Reading metadata...')
  const metadata = getChunkedMetadata(chunksDir)
  if (metadata) {
    console.log(`  ✅ Original size: ${metadata.totalSizeMB} MB`)
    console.log(`  ✅ Compressed: ${metadata.totalCompressedSizeMB} MB`)
    console.log(`  ✅ Compression: ${metadata.compressionRatio}%`)
    console.log(`  ✅ Chunks: ${metadata.numChunks}\n`)
  }

  // Test 3: Load database
  console.log('Test 3: Loading database from chunks...')
  const startTime = Date.now()
  const reader = await loadGeoIPFromChunks(chunksDir)
  const loadTime = Date.now() - startTime
  console.log(`  ✅ Database loaded in ${loadTime}ms\n`)

  // Test 4: Lookup test IPs
  console.log('Test 4: Testing IP lookups...')
  const testIPs = [
    { ip: '8.8.8.8', expected: 'US' },
    { ip: '1.1.1.1', expected: 'AU' },
    { ip: '114.114.114.114', expected: 'CN' },
    { ip: '208.67.222.222', expected: 'US' },
  ]

  for (const { ip, expected } of testIPs) {
    const result = reader.get(ip)
    const country = result?.country?.iso_code || 'Unknown'
    const status = country === expected ? '✅' : '⚠️'
    console.log(`  ${status} ${ip} -> ${country} (expected: ${expected})`)
  }

  console.log('\n✅ All tests passed!')
}

test().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})

