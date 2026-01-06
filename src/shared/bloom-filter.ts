/**
 * Simple Bloom Filter implementation for fast membership testing
 * Accepts false positives (may reject unique items) but never false negatives
 */
export class BloomFilter {
  private bitArray: Uint8Array
  private size: number
  private hashCount: number

  /**
   * @param size - Size of the bit array (should be larger than expected items)
   * @param hashCount - Number of hash functions to use (more = fewer false positives, more computation)
   */
  constructor(size: number = 100000, hashCount: number = 3) {
    this.size = size
    this.hashCount = hashCount
    // Create bit array (each byte holds 8 bits)
    this.bitArray = new Uint8Array(Math.ceil(size / 8))
  }

  /**
   * Hash function using djb2 algorithm
   */
  private hash1(str: string): number {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i)
    }
    return Math.abs(hash) % this.size
  }

  /**
   * Hash function using sdbm algorithm
   */
  private hash2(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash
    }
    return Math.abs(hash) % this.size
  }

  /**
   * Hash function using fnv1a algorithm
   */
  private hash3(str: string): number {
    let hash = 2166136261
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash +=
        (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }
    return Math.abs(hash) % this.size
  }

  /**
   * Get hash values for an item
   */
  private getHashes(item: string): number[] {
    const hashes: number[] = []
    hashes.push(this.hash1(item))
    hashes.push(this.hash2(item))
    hashes.push(this.hash3(item))

    // Generate additional hashes by combining existing ones
    for (let i = 3; i < this.hashCount; i++) {
      hashes.push((hashes[i - 3] + i * hashes[i - 2]) % this.size)
    }

    return hashes.slice(0, this.hashCount)
  }

  /**
   * Set a bit in the bit array
   */
  private setBit(index: number): void {
    const byteIndex = Math.floor(index / 8)
    const bitIndex = index % 8
    this.bitArray[byteIndex] |= 1 << bitIndex
  }

  /**
   * Check if a bit is set in the bit array
   */
  private getBit(index: number): boolean {
    const byteIndex = Math.floor(index / 8)
    const bitIndex = index % 8
    return (this.bitArray[byteIndex] & (1 << bitIndex)) !== 0
  }

  /**
   * Add an item to the Bloom Filter
   */
  add(item: string): void {
    const hashes = this.getHashes(item)
    for (const hash of hashes) {
      this.setBit(hash)
    }
  }

  /**
   * Check if an item might be in the Bloom Filter
   * @returns true if item might exist (could be false positive), false if definitely doesn't exist
   */
  mightContain(item: string): boolean {
    const hashes = this.getHashes(item)
    for (const hash of hashes) {
      if (!this.getBit(hash)) {
        return false // Definitely not in the filter
      }
    }
    return true // Might be in the filter (could be false positive)
  }

  /**
   * Add multiple items to the Bloom Filter
   */
  addBulk(items: string[]): void {
    for (const item of items) {
      this.add(item)
    }
  }

  /**
   * Clear the Bloom Filter
   */
  clear(): void {
    this.bitArray.fill(0)
  }
}
