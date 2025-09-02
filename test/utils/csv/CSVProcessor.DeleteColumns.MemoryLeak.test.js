const fs = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../../utils.js');
const CSVProcessor = require('../../../src/appmixer/utils/csv/CSVProcessor');
const { MemoryMonitor } = require('./memory-monitor');
const { generateTestCSV } = require('./generate-test-csv');

describe('CSVProcessor DeleteColumns Memory Leak Tests', function() {

    // Extended timeout for large file operations
    this.timeout(120000);

    let context;
    let testFilePath;
    let monitor;

    before(async function() {
        console.log('Generating test CSV file for DeleteColumns tests...');
        // Generate a 100MB CSV file with 1KB rows and 4 columns (so we can delete some)
        testFilePath = await new Promise((resolve, reject) => {
            try {
                const filepath = generateTestCSV(100, 1, 4);
                // Wait for file generation to complete
                const checkInterval = setInterval(() => {
                    if (fs.existsSync(filepath)) {
                        clearInterval(checkInterval);
                        resolve(filepath);
                    }
                }, 1000);

                // Timeout after 60 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error('Test file generation timeout'));
                }, 60000);
            } catch (error) {
                reject(error);
            }
        });

        console.log(`Test file generated: ${testFilePath}`);

        // Wait a bit more to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify file exists and has expected size
        const stats = fs.statSync(testFilePath);
        console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        assert(stats.size > 90 * 1024 * 1024, 'Test file should be at least 90MB');
    });

    beforeEach(function() {
        monitor = new MemoryMonitor();

        context = {
            ...testUtils.createMockContext(),
            getFileReadStream: () => fs.createReadStream(testFilePath, {
                encoding: null,
                highWaterMark: 255 * 1024 // Simulate GridFS default chunk size
            }),
            replaceFileStream: sinon.stub().callsFake((fileId, stream) => {
                // Simulate file replacement by consuming the stream
                return new Promise((resolve, reject) => {
                    let size = 0;
                    stream.on('data', (chunk) => {
                        size += chunk.length;
                    });
                    stream.on('end', () => {
                        resolve({
                            fileId: 'new-file-id',
                            filename: 'test-processed.csv',
                            length: size
                        });
                    });
                    stream.on('error', reject);
                });
            }),
            lock: sinon.stub().returns({
                unlock: sinon.stub(),
                extend: sinon.stub().resolves()
            }),
            config: {
                lockTTL: 60000,
                lockExtendTime: 60000,
                lockExtendInterval: 59000
            }
        };
    });

    afterEach(function() {
        if (monitor && monitor.measurements.length > 0) {
            monitor.printSummary();
        }
    });

    after(function() {
        // Clean up test file
        if (testFilePath && fs.existsSync(testFilePath)) {
            try {
                fs.unlinkSync(testFilePath);
                console.log('Test file cleaned up');
            } catch (err) {
                console.warn('Failed to clean up test file:', err.message);
            }
        }
    });

    it('should not leak memory during single deleteColumns operation', async function() {
        monitor.start();

        const processor = new CSVProcessor(context, 'test-file-id', {
            withHeaders: true,
            delimiter: ','
        });

        monitor.measure('before_deleteColumns');

        const result = await processor.deleteColumns({
            columns: 'Column3' // Delete one column
        });

        monitor.measure('after_deleteColumns');

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        monitor.stop();

        // Assert operation succeeded
        assert(result, 'deleteColumns should return a result');
        assert(result.fileId, 'Result should have fileId');

        // Assert memory usage is reasonable (max 50MB heap growth)
        const memoryAssertion = monitor.assertMemoryGrowth(50, 100);
        console.log(`Memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB`);
    });

    it('should not leak memory during multiple deleteColumns operations', async function() {
        monitor.start();

        const processor = new CSVProcessor(context, 'test-file-id', {
            withHeaders: true,
            delimiter: ','
        });

        // Perform multiple deleteColumns operations to detect cumulative leaks
        const columnsToDelete = ['Column3', 'Column4', 'Column2'];

        for (let i = 0; i < columnsToDelete.length; i++) {
            monitor.measure(`before_iteration_${i + 1}`);

            // Reset the file stream for each iteration
            context.getFileReadStream = () => fs.createReadStream(testFilePath, {
                encoding: null,
                highWaterMark: 255 * 1024
            });

            const result = await processor.deleteColumns({
                columns: columnsToDelete[i]
            });

            monitor.measure(`after_iteration_${i + 1}`);

            assert(result, `deleteColumns iteration ${i + 1} should return a result`);

            // Force garbage collection between iterations
            if (global.gc) {
                global.gc();
            }

            // Brief pause to allow cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        monitor.stop();

        // For multiple operations, allow slightly higher memory growth
        // but it should still be reasonable (max 80MB heap growth for 3 operations)
        const memoryAssertion = monitor.assertMemoryGrowth(80, 150);
        console.log(`Multi-operation memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB over ${columnsToDelete.length} operations`);
    });

    it('should not leak memory when deleting multiple columns at once', async function() {
        monitor.start();

        const processor = new CSVProcessor(context, 'test-file-id', {
            withHeaders: true,
            delimiter: ','
        });

        monitor.measure('before_deleteMultipleColumns');

        const result = await processor.deleteColumns({
            columns: 'Column3,Column4' // Delete multiple columns in one operation
        });

        monitor.measure('after_deleteMultipleColumns');

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        monitor.stop();

        // Assert operation succeeded
        assert(result, 'deleteColumns with multiple columns should return a result');
        assert(result.fileId, 'Result should have fileId');

        // Assert memory usage is reasonable
        const memoryAssertion = monitor.assertMemoryGrowth(50, 100);
        console.log(`Multiple columns deletion memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB`);
    });

    it('should not leak memory when deleting columns by index (no headers)', async function() {
        monitor.start();

        const processor = new CSVProcessor(context, 'test-file-id', {
            withHeaders: false,
            delimiter: ','
        });

        monitor.measure('before_deleteByIndex');

        const result = await processor.deleteColumns({
            indexes: '2,3' // Delete columns by index
        });

        monitor.measure('after_deleteByIndex');

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        monitor.stop();

        // Assert operation succeeded
        assert(result, 'deleteColumns by index should return a result');
        assert(result.fileId, 'Result should have fileId');

        // Assert memory usage is reasonable
        const memoryAssertion = monitor.assertMemoryGrowth(50, 100);
        console.log(`Index-based deletion memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB`);
    });

    it('should not accumulate memory across different processor instances', async function() {
        monitor.start();

        const iterations = 3;

        for (let i = 0; i < iterations; i++) {
            monitor.measure(`before_processor_${i + 1}`);

            // Create a new processor instance for each iteration
            const processor = new CSVProcessor(context, `test-file-id-${i}`, {
                withHeaders: true,
                delimiter: ','
            });

            // Reset the file stream for each iteration
            context.getFileReadStream = () => fs.createReadStream(testFilePath, {
                encoding: null,
                highWaterMark: 255 * 1024
            });

            const result = await processor.deleteColumns({
                columns: 'Column3'
            });

            monitor.measure(`after_processor_${i + 1}`);

            assert(result, `Processor ${i + 1} deleteColumns should return a result`);

            // Force garbage collection between instances
            if (global.gc) {
                global.gc();
            }

            // Brief pause to allow cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        monitor.stop();

        // Memory growth should be minimal when using different processor instances
        const memoryAssertion = monitor.assertMemoryGrowth(60, 120);
        console.log(`Multiple processor instances memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB over ${iterations} processor instances`);
    });
});
