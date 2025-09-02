# CSVProcessor Memory Leak Tests

This directory contains specialized unit tests for detecting memory leaks in the CSVProcessor.js implementation when processing large CSV files.

## Test Files

1. **CSVProcessor.AddColumns.MemoryLeak.test.js** - Tests for memory leaks in `addColumn()` operations
2. **CSVProcessor.DeleteColumns.MemoryLeak.test.js** - Tests for memory leaks in `deleteColumns()` operations
3. **memory-monitor.js** - Memory monitoring utility for tracking heap and RSS usage
4. **generate-test-csv.js** - Script for generating large test CSV files with specific characteristics

## Test Parameters

The tests are designed to match the original problem requirements:
- **File size**: 100MB total
- **Row size**: ~1KB per row  
- **Columns**: 2 columns for AddColumns tests, 4 columns for DeleteColumns tests
- **Memory monitoring**: Tracks heap and RSS usage before, during, and after operations

## Running the Tests

### Prerequisites
Make sure Node.js is configured with garbage collection exposure and sufficient memory:

```bash
node --max-old-space-size=2048 --expose-gc
```

### Individual Test Suites

Run AddColumns memory leak tests:
```bash
node --max-old-space-size=2048 --expose-gc node_modules/.bin/mocha test/utils/csv/CSVProcessor.AddColumns.MemoryLeak.test.js --timeout 200000
```

Run DeleteColumns memory leak tests:
```bash  
node --max-old-space-size=2048 --expose-gc node_modules/.bin/mocha test/utils/csv/CSVProcessor.DeleteColumns.MemoryLeak.test.js --timeout 200000
```

### Combined Test Suite

Run both test suites together:
```bash
node --max-old-space-size=2048 --expose-gc node_modules/.bin/mocha test/utils/csv/CSVProcessor.*.MemoryLeak.test.js --timeout 300000
```

## Memory Assertions

The tests include configurable memory growth assertions:

- **Single operations**: Max 50MB heap growth, 100MB RSS growth
- **Multiple operations**: Max 80MB heap growth, 150MB RSS growth
- **Different positioning methods**: Max 70MB heap growth, 140MB RSS growth

If memory growth exceeds these thresholds, the tests will fail with detailed memory usage information.

## Test Structure

### AddColumns Tests
1. **Single addColumn operation** - Tests memory usage for one column addition
2. **Multiple addColumn operations** - Tests cumulative memory usage across 3 operations
3. **Different positioning methods** - Tests memory usage with beforeColumn/afterColumn positioning

### DeleteColumns Tests  
1. **Single deleteColumns operation** - Tests memory usage for one column deletion
2. **Multiple deleteColumns operations** - Tests cumulative memory usage across 3 deletions
3. **Multiple columns at once** - Tests deleting multiple columns in one operation
4. **Index-based deletion** - Tests deletion by column index (no headers)
5. **Multiple processor instances** - Tests memory across different CSVProcessor instances

## Memory Monitoring

The `MemoryMonitor` class provides detailed tracking:

- Heap used/total memory
- External memory (buffers, etc.)
- Resident Set Size (RSS)  
- Memory growth calculations
- Human-readable output formatting
- Configurable assertion thresholds

### Example Memory Output

```
=== Memory Usage Summary ===
Duration: 2495ms
Heap Used Delta: 564.00 KB
Heap Total Delta: -1.75 MB
External Delta: -99.59 MB
RSS Delta: -12.30 MB

Detailed measurements:
start (+5ms): Heap: 10.47 MB, RSS: 213.71 MB
before_addColumn (+5ms): Heap: 10.66 MB, RSS: 213.71 MB
after_addColumn (+2490ms): Heap: 11.32 MB, RSS: 201.41 MB
stop (+2495ms): Heap: 11.02 MB, RSS: 201.41 MB
==============================
```

## Test File Generation

The `generate-test-csv.js` script creates CSV files with specific size characteristics:

```javascript
// Generate 100MB file with 1KB rows and 2 columns
generateTestCSV(100, 1, 2);

// Generate 50MB file with 2KB rows and 4 columns  
generateTestCSV(50, 2, 4);
```

Generated files are automatically cleaned up after tests complete.

## Configuration

### Memory Limits
You can adjust memory assertion limits by modifying the calls to `assertMemoryGrowth()`:

```javascript
// Allow max 100MB heap growth and 200MB RSS growth
monitor.assertMemoryGrowth(100, 200);
```

### Test File Parameters
Modify test file generation in the `before()` hooks:

```javascript
// Generate different size files for testing
const filepath = generateTestCSV(200, 2, 3); // 200MB, 2KB rows, 3 columns
```

## Troubleshooting

### Out of Memory Errors
- Increase `--max-old-space-size` value
- Reduce test file size or number of iterations
- Check for actual memory leaks in the implementation

### Test Timeouts
- Increase `--timeout` value for large file operations
- Consider reducing file size for faster test execution

### File Generation Issues
- Ensure sufficient disk space (tests generate 100MB+ files)
- Check write permissions in test directory
- Verify Node.js has enough memory for file generation

## Expected Results

When the CSVProcessor implementation is working correctly:
- Memory growth should be minimal (< 50MB for single operations)
- RSS may decrease due to garbage collection
- No exponential memory growth across multiple operations
- Clean memory cleanup after operations complete

If memory leaks exist, you will see:
- Heap usage growing significantly with each operation
- RSS continuously increasing
- Test failures with detailed memory usage reports