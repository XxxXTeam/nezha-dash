#!/usr/bin/env node
/**
 * GeoIP Database Splitter and Compressor
 * 
 * This script splits a large GeoIP .mmdb file into smaller compressed chunks
 * that can be loaded at runtime to bypass Cloudflare Workers size limits
 * 
 * Usage:
 *   node scripts/split-geoip-db.js [input.mmdb] [output-dir] [chunk-size-mb]
 * 
 * Example:
 *   node scripts/split-geoip-db.js lib/maxmind-db/GeoLite2-City.mmdb lib/maxmind-db/chunks 5
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Parse command line arguments
const args = process.argv.slice(2)
const inputFile = args[0] || 'lib/maxmind-db/GeoLite2-City.mmdb'
const outputDir = args[1] || 'lib/maxmind-db/chunks'
const chunkSizeMB = parseInt(args[2] || '5', 10)

const CHUNK_SIZE = chunkSizeMB * 1024 * 1024 // Convert MB to bytes

console.log(`
╔════════════════════════════════════════╗
║  GeoIP Database Splitter & Compressor  ║
╚════════════════════════════════════════╝

Input file:   ${inputFile}
Output dir:   ${outputDir}
Chunk size:   ${chunkSizeMB} MB
`)

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: Input file not found: ${inputFile}`)
  process.exit(1)
}

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`✅ Created output directory: ${outputDir}`)
}

// Read the entire file
console.log('📖 Reading input file...')
const fileBuffer = fs.readFileSync(inputFile)
const totalSize = fileBuffer.length
const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)

console.log(`📊 File size: ${totalSizeMB} MB (${totalSize} bytes)`)

// Calculate number of chunks
const numChunks = Math.ceil(totalSize / CHUNK_SIZE)
console.log(`📦 Will create ${numChunks} chunks\n`)

// Split and compress
const chunks = []
let totalCompressedSize = 0

for (let i = 0; i < numChunks; i++) {
  const start = i * CHUNK_SIZE
  const end = Math.min(start + CHUNK_SIZE, totalSize)
  const chunk = fileBuffer.slice(start, end)
  
  // Compress using gzip (best compression)
  const compressed = zlib.gzipSync(chunk, { level: 9 })
  
  const chunkFile = path.join(outputDir, `chunk_${String(i).padStart(3, '0')}.gz`)
  fs.writeFileSync(chunkFile, compressed)
  
  const originalSize = chunk.length
  const compressedSize = compressed.length
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
  
  totalCompressedSize += compressedSize
  
  console.log(`  ✅ Chunk ${i + 1}/${numChunks}: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${ratio}% reduction)`)
  
  chunks.push({
    index: i,
    originalSize,
    compressedSize,
    filename: `chunk_${String(i).padStart(3, '0')}.gz`
  })
}

// Create metadata file
const metadata = {
  originalFile: path.basename(inputFile),
  totalSize,
  totalSizeMB: parseFloat(totalSizeMB),
  chunkSize: CHUNK_SIZE,
  numChunks,
  totalCompressedSize,
  totalCompressedSizeMB: (totalCompressedSize / (1024 * 1024)).toFixed(2),
  compressionRatio: ((1 - totalCompressedSize / totalSize) * 100).toFixed(1),
  chunks,
  createdAt: new Date().toISOString()
}

const metadataFile = path.join(outputDir, 'metadata.json')
fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))

console.log(`
╔════════════════════════════════════════╗
║           Summary                      ║
╚════════════════════════════════════════╝

Original size:    ${totalSizeMB} MB
Compressed size:  ${metadata.totalCompressedSizeMB} MB
Compression:      ${metadata.compressionRatio}% reduction
Chunks created:   ${numChunks}
Metadata file:    ${metadataFile}

✅ Done! Chunks saved to: ${outputDir}
`)

// Generate loader code snippet
console.log(`
📝 Add this to your .gitignore:
${outputDir}/

💡 Use the chunks with the loader:
import { loadGeoIPFromChunks } from '@/lib/geo/chunked-loader'
const reader = await loadGeoIPFromChunks('${outputDir}')
`)

