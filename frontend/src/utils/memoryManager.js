// Memory management utilities for Tesseract.js and WebAssembly

export class MemoryManager {
  constructor() {
    this.activeWorkers = new Set();
    this.memoryThreshold = 0.8; // 80% memory usage threshold
    this.maxWorkers = 2; // Maximum concurrent workers
  }

  // Check if we have enough memory for a new worker
  canCreateWorker() {
    // Check if we're under the worker limit
    if (this.activeWorkers.size >= this.maxWorkers) {
      console.warn("Maximum worker limit reached");
      return false;
    }

    // Check memory usage if available
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      if (memoryUsage > this.memoryThreshold) {
        console.warn("Memory usage too high:", (memoryUsage * 100).toFixed(1) + "%");
        return false;
      }
    }

    return true;
  }

  // Register a new worker
  registerWorker(worker) {
    this.activeWorkers.add(worker);
    console.log(`Worker registered. Active workers: ${this.activeWorkers.size}`);
  }

  // Unregister and cleanup a worker
  async unregisterWorker(worker) {
    if (this.activeWorkers.has(worker)) {
      try {
        await worker.terminate();
        this.activeWorkers.delete(worker);
        console.log(`Worker terminated. Active workers: ${this.activeWorkers.size}`);
      } catch (error) {
        console.warn("Error terminating worker:", error);
        this.activeWorkers.delete(worker);
      }
    }
  }

  // Cleanup all workers
  async cleanupAll() {
    const cleanupPromises = Array.from(this.activeWorkers).map(worker => 
      this.unregisterWorker(worker)
    );
    await Promise.all(cleanupPromises);
    console.log("All workers cleaned up");
  }

  // Force garbage collection if available
  forceGC() {
    if (window.gc) {
      window.gc();
      console.log("Garbage collection triggered");
    } else {
      console.log("Garbage collection not available");
    }
  }

  // Get memory info
  getMemoryInfo() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        usage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(1) + "%"
      };
    }
    return null;
  }

  // Check if we should use backend instead of client-side
  shouldUseBackend() {
    const memoryInfo = this.getMemoryInfo();
    if (memoryInfo && parseFloat(memoryInfo.usage) > 70) {
      console.log("High memory usage detected, recommending backend processing");
      return true;
    }
    return false;
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  memoryManager.cleanupAll();
});

// Periodic cleanup every 5 minutes
setInterval(() => {
  if (memoryManager.activeWorkers.size > 0) {
    console.log("Periodic cleanup: Active workers:", memoryManager.activeWorkers.size);
  }
}, 5 * 60 * 1000);
