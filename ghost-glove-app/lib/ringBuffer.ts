// ─── Generic Ring Buffer ─────────────────────────────────────────────────────────
// Decoupled from the display layer — can be flushed independently (F5).
// When full, the oldest entry is overwritten (FIFO eviction).

export const DEFAULT_BUFFER_SIZE = 300; // ~60s at 5Hz

export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0; // write pointer
  private count: number = 0;
  readonly capacity: number;

  constructor(capacity: number = DEFAULT_BUFFER_SIZE) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(undefined);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  // Returns all stored items in insertion order (oldest → newest)
  toArray(): T[] {
    if (this.count === 0) return [];
    const result: T[] = [];

    if (this.count < this.capacity) {
      // Buffer not yet full — items start at index 0
      for (let i = 0; i < this.count; i++) {
        result.push(this.buffer[i] as T);
      }
    } else {
      // Buffer full — oldest item is at current head
      for (let i = 0; i < this.capacity; i++) {
        const idx = (this.head + i) % this.capacity;
        result.push(this.buffer[idx] as T);
      }
    }
    return result;
  }

  // Drain: return all items and reset the buffer
  flush(): T[] {
    const items = this.toArray();
    this.reset();
    return items;
  }

  reset(): void {
    this.buffer = new Array(this.capacity).fill(undefined);
    this.head = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }

  get isFull(): boolean {
    return this.count === this.capacity;
  }
}
