const fs = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../../utils.js');
const CSVProcessor = require('../../../src/appmixer/utils/csv/CSVProcessor');
const { MemoryMonitor } = require('./memory-monitor');
const { generateTestCSV } = require('./generate-test-csv');

describe('CSVProcessor AddColumns Memory Leak Tests', function() {

    // Extended timeout for large file operations
    this.timeout(120000);

    let context;
    let testFilePath;
    let monitor;

    before(async function() {
        console.log('Generating test CSV file...');
        // Generate a 100MB CSV file with 1KB rows and 2 columns
        testFilePath = await new Promise((resolve, reject) => {
            try {
                const filepath = generateTestCSV(100, 1, 2);
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

    it('should not leak memory during single addColumn operation', async function() {
        monitor.start();

        const processor = new CSVProcessor(context, 'test-file-id', {
            withHeaders: true,
            delimiter: ','
        });

        monitor.measure('before_addColumn');

        const result = await processor.addColumn({
            positioningMethod: 'afterColumn',
            positioningColumn: 'Column1',
            name: 'NewColumn',
            defaultValue: 'default'
        });

        monitor.measure('after_addColumn');

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        monitor.stop();

        // Assert operation succeeded
        assert(result, 'addColumn should return a result');
        assert(result.fileId, 'Result should have fileId');

        // Assert memory usage is reasonable (max 50MB heap growth)
        const memoryAssertion = monitor.assertMemoryGrowth(50, 100);
        console.log(`Memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB`);
    });

    it('should not leak memory during multiple addColumn operations', async function() {
        monitor.start();

        const processor = new CSVProcessor(context, 'test-file-id', {
            withHeaders: true,
            delimiter: ','
        });

        // Perform multiple addColumn operations to detect cumulative leaks
        const iterations = 3;

        for (let i = 0; i < iterations; i++) {
            monitor.measure(`before_iteration_${i + 1}`);

            // Reset the file stream for each iteration
            context.getFileReadStream = () => fs.createReadStream(testFilePath, {
                encoding: null,
                highWaterMark: 255 * 1024
            });

            const result = await processor.addColumn({
                positioningMethod: 'afterColumn',
                positioningColumn: 'Column1',
                name: `NewColumn${i + 1}`,
                defaultValue: `default${i + 1}`
            });

            monitor.measure(`after_iteration_${i + 1}`);

            assert(result, `addColumn iteration ${i + 1} should return a result`);

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
        console.log(`Multi-operation memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB over ${iterations} operations`);
    });

    it('should handle addColumn with different positioning methods without memory leaks', async function() {
        monitor.start();

        const processor = new CSVProcessor(context, 'test-file-id', {
            withHeaders: true,
            delimiter: ','
        });

        // Test different positioning methods
        const positioningTests = [
            { method: 'afterColumn', column: 'Column1', name: 'AfterCol1' },
            { method: 'beforeColumn', column: 'Column2', name: 'BeforeCol2' }
        ];

        for (let i = 0; i < positioningTests.length; i++) {
            const test = positioningTests[i];
            monitor.measure(`before_${test.method}`);

            // Reset the file stream for each test
            context.getFileReadStream = () => fs.createReadStream(testFilePath, {
                encoding: null,
                highWaterMark: 255 * 1024
            });

            const result = await processor.addColumn({
                positioningMethod: test.method,
                positioningColumn: test.column,
                name: test.name,
                defaultValue: 'test'
            });

            monitor.measure(`after_${test.method}`);

            assert(result, `addColumn with ${test.method} should return a result`);

            if (global.gc) {
                global.gc();
            }
        }

        monitor.stop();

        // Assert reasonable memory usage for different positioning methods
        const memoryAssertion = monitor.assertMemoryGrowth(70, 140);
        console.log(`Positioning methods memory test passed - Heap growth: ${memoryAssertion.heapGrowthMB.toFixed(2)}MB, RSS growth: ${memoryAssertion.rssGrowthMB.toFixed(2)}MB`);
    });
});
