import fs from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import { Reader, type CityResponse } from "maxmind"

interface ChunkMetadata {
  originalFile: string
  totalSize: number
  totalSizeMB: number
  chunkSize: number
  numChunks: number
  totalCompressedSize: number
  totalCompressedSizeMB: string
  compressionRatio: string
  chunks: Array<{
    index: number
    originalSize: number
    compressedSize: number
    filename: string
  }>
  createdAt: string
}

let cachedReader: Reader<any> | null = null
let cachedBuffer: Buffer | null = null

/**
 * Load GeoIP database from compressed chunks
 * @param chunksDir - Directory containing the compressed chunks
 * @returns MaxMind Reader instance
 */
export async function loadGeoIPFromChunks(chunksDir: string): Promise<Reader<any>> {
  // Return cached reader if available
  if (cachedReader) {
    return cachedReader
  }

  // Read metadata
  const metadataPath = path.join(chunksDir, "metadata.json")
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Metadata file not found: ${metadataPath}`)
  }

  const metadata: ChunkMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"))

  // Allocate buffer for the entire database
  const fullBuffer = Buffer.allocUnsafe(metadata.totalSize)
  let offset = 0

  // Load and decompress each chunk
  for (let i = 0; i < metadata.numChunks; i++) {
    const chunkInfo = metadata.chunks[i]
    const chunkPath = path.join(chunksDir, chunkInfo.filename)

    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Chunk file not found: ${chunkPath}`)
    }

    // Read compressed chunk
    const compressedChunk = fs.readFileSync(chunkPath)

    // Decompress
    const decompressedChunk = gunzipSync(compressedChunk)

    // Verify size
    if (decompressedChunk.length !== chunkInfo.originalSize) {
      throw new Error(
        `Chunk ${i} size mismatch: expected ${chunkInfo.originalSize}, got ${decompressedChunk.length}`,
      )
    }

    // Copy to full buffer
    decompressedChunk.copy(fullBuffer, offset)
    offset += decompressedChunk.length
  }

  // Create reader
  cachedReader = new Reader<any>(fullBuffer)
  cachedBuffer = fullBuffer

  return cachedReader
}

/**
 * Check if chunked database exists
 */
export function hasChunkedDatabase(chunksDir: string): boolean {
  const metadataPath = path.join(chunksDir, "metadata.json")
  return fs.existsSync(metadataPath)
}

/**
 * Get chunked database metadata without loading
 */
export function getChunkedMetadata(chunksDir: string): ChunkMetadata | null {
  const metadataPath = path.join(chunksDir, "metadata.json")
  if (!fs.existsSync(metadataPath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(metadataPath, "utf8"))
}

/**
 * Clear cached reader and buffer
 */
export function clearChunkedCache() {
  cachedReader = null
  cachedBuffer = null
}

