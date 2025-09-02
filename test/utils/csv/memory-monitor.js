/**
 * Memory monitoring utilities for CSV processor tests
 */

class MemoryMonitor {
    constructor() {
        this.measurements = [];
        this.startTime = null;
    }

    /**
     * Start monitoring memory usage
     */
    start() {
        this.startTime = Date.now();
        this.measurements = [];
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        this.measure('start');
    }

    /**
     * Take a memory measurement with a label
     * @param {string} label - Label for this measurement
     */
    measure(label) {
        const usage = process.memoryUsage();
        const timestamp = Date.now();
        const elapsed = this.startTime ? timestamp - this.startTime : 0;

        this.measurements.push({
            label,
            timestamp,
            elapsed,
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss
        });

        return usage;
    }

    /**
     * Stop monitoring and return summary
     */
    stop() {
        this.measure('stop');
        return this.getSummary();
    }

    /**
     * Get summary of memory usage
     */
    getSummary() {
        if (this.measurements.length < 2) {
            return null;
        }

        const start = this.measurements[0];
        const end = this.measurements[this.measurements.length - 1];

        return {
            duration: end.elapsed,
            heapUsedDelta: end.heapUsed - start.heapUsed,
            heapTotalDelta: end.heapTotal - start.heapTotal,
            externalDelta: end.external - start.external,
            rssDelta: end.rss - start.rss,
            startMemory: {
                heapUsed: start.heapUsed,
                heapTotal: start.heapTotal,
                external: start.external,
                rss: start.rss
            },
            endMemory: {
                heapUsed: end.heapUsed,
                heapTotal: end.heapTotal,
                external: end.external,
                rss: end.rss
            },
            measurements: this.measurements
        };
    }

    /**
     * Format bytes for human-readable output
     * @param {number} bytes
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const size = sizes[i] || 'XXB';
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${size}`;
    }

    /**
     * Print memory summary in a readable format
     */
    printSummary() {
        const summary = this.getSummary();
        if (!summary) {
            console.log('No measurements available');
            return;
        }

        console.log('\n=== Memory Usage Summary ===');
        console.log(`Duration: ${summary.duration}ms`);
        console.log(`Heap Used Delta: ${MemoryMonitor.formatBytes(summary.heapUsedDelta)}`);
        console.log(`Heap Total Delta: ${MemoryMonitor.formatBytes(summary.heapTotalDelta)}`);
        console.log(`External Delta: ${MemoryMonitor.formatBytes(summary.externalDelta)}`);
        console.log(`RSS Delta: ${MemoryMonitor.formatBytes(summary.rssDelta)}`);

        console.log('\nDetailed measurements:');
        for (const measurement of summary.measurements) {
            console.log(`${measurement.label} (+${measurement.elapsed}ms): ` +
                       `Heap: ${MemoryMonitor.formatBytes(measurement.heapUsed)}, ` +
                       `RSS: ${MemoryMonitor.formatBytes(measurement.rss)}`);
        }
        console.log('==============================\n');
    }

    /**
     * Assert that memory growth is within acceptable limits
     * @param {number} maxHeapGrowthMB - Maximum acceptable heap growth in MB
     * @param {number} maxRSSGrowthMB - Maximum acceptable RSS growth in MB
     */
    assertMemoryGrowth(maxHeapGrowthMB = 50, maxRSSGrowthMB = 100) {
        const summary = this.getSummary();
        if (!summary) {
            throw new Error('No memory measurements available for assertion');
        }

        const heapGrowthMB = summary.heapUsedDelta / (1024 * 1024);
        const rssGrowthMB = summary.rssDelta / (1024 * 1024);

        if (heapGrowthMB > maxHeapGrowthMB) {
            throw new Error(`Memory leak detected! Heap grew by ${heapGrowthMB.toFixed(2)}MB, ` +
                          `exceeding limit of ${maxHeapGrowthMB}MB`);
        }

        if (rssGrowthMB > maxRSSGrowthMB) {
            throw new Error(`Memory leak detected! RSS grew by ${rssGrowthMB.toFixed(2)}MB, ` +
                          `exceeding limit of ${maxRSSGrowthMB}MB`);
        }

        return {
            heapGrowthMB,
            rssGrowthMB,
            passed: true
        };
    }
}

module.exports = { MemoryMonitor };
