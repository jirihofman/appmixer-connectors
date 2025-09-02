#!/usr/bin/env node

/**
 * Script to generate large CSV files for memory leak testing
 * Usage: node generate-test-csv.js [targetSizeMB] [rowSizeKB] [numColumns]
 * Default: 100MB file with ~1KB rows and 2 columns
 */

const fs = require('fs');
const path = require('path');

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateTestCSV(targetSizeMB = 100, rowSizeKB = 1, numColumns = 2) {
    const targetSizeBytes = targetSizeMB * 1024 * 1024;
    const rowSizeBytes = rowSizeKB * 1024;

    // Calculate approximate content per cell to achieve target row size
    // Account for delimiters and newline: (numColumns-1) commas + 1 newline
    const overheadBytes = (numColumns - 1) + 1;
    const contentBytesPerRow = rowSizeBytes - overheadBytes;
    const contentBytesPerCell = Math.floor(contentBytesPerRow / numColumns);

    const filename = `test-csv-${targetSizeMB}mb-${rowSizeKB}kb-${numColumns}cols.csv`;
    const filepath = path.join(__dirname, filename);

    console.log(`Generating ${filename}...`);
    console.log(`Target size: ${targetSizeMB}MB (${targetSizeBytes} bytes)`);
    console.log(`Row size: ~${rowSizeKB}KB (${rowSizeBytes} bytes)`);
    console.log(`Columns: ${numColumns}`);
    console.log(`Content per cell: ~${contentBytesPerCell} bytes`);

    const writeStream = fs.createWriteStream(filepath);

    // Write header
    const headers = Array.from({ length: numColumns }, (_, i) => `Column${i + 1}`);
    writeStream.write(headers.join(',') + '\n');

    let bytesWritten = Buffer.byteLength(headers.join(',') + '\n');
    let rowsWritten = 1; // Header counts as first row

    // Generate data rows
    while (bytesWritten < targetSizeBytes) {
        const row = Array.from({ length: numColumns }, () =>
            generateRandomString(contentBytesPerCell)
        );
        const rowString = row.join(',') + '\n';
        const rowBytes = Buffer.byteLength(rowString);

        writeStream.write(rowString);
        bytesWritten += rowBytes;
        rowsWritten++;

        if (rowsWritten % 1000 === 0) {
            process.stdout.write(`\rRows written: ${rowsWritten}, Size: ${(bytesWritten / 1024 / 1024).toFixed(2)}MB`);
        }
    }

    writeStream.end();

    writeStream.on('finish', () => {
        console.log(`\nGenerated ${filename}:`);
        console.log(`- Actual size: ${(bytesWritten / 1024 / 1024).toFixed(2)}MB`);
        console.log(`- Rows: ${rowsWritten}`);
        console.log(`- Average row size: ${(bytesWritten / rowsWritten).toFixed(0)} bytes`);
    });

    writeStream.on('error', (err) => {
        console.error('Error generating file:', err);
    });

    return filepath;
}

// Run if called directly
if (require.main === module) {
    const targetSizeMB = parseInt(process.argv[2]) || 100;
    const rowSizeKB = parseInt(process.argv[3]) || 1;
    const numColumns = parseInt(process.argv[4]) || 2;

    generateTestCSV(targetSizeMB, rowSizeKB, numColumns);
}

module.exports = { generateTestCSV };
