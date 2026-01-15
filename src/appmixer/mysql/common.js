'use strict';
const mysql = require('mysql');
const sqlstring = require('sqlstring');
const EventEmitter = require('events');

class StreamProcessor {

    constructor(context) {

        this.eventEmitter = new EventEmitter();
        this.context = context;
    }

    processStream(conn, queryStream, processCb, concurrency = 1) {

        let promises = [];
        return new Promise((resolve, reject) => {
            const processCallback = async (row) => {
                try {
                    return await processCb(row);
                } catch (err) {
                    // Just log the error. This prevents the promise chain from breaking if there
                    // was an error while processing a row.
                    this.context.log('error', err.message, err);
                }
            };

            queryStream
                .on('error', async (err) => {
                    // Handle error, an 'end' event will be emitted after this as well
                    reject(err);
                })
                .on('result', async (row) => {
                    // Pausing the connection is useful if your processing involves I/O

                    const promise = processCallback(row);
                    promises.push(promise);
                    if (promises.length >= concurrency) {
                        conn.pause();
                        this.eventEmitter.emit('batchProcessed');
                        await Promise.all(promises);
                        promises = [];
                        conn.resume();
                    }
                })
                .on('end', async () => {
                    // all rows have been received
                    await Promise.all(promises);
                    resolve();
                })
                .resume();
        });
    }

    onBatchProcessed(callback) {

        this.eventEmitter.on('batchProcessed', callback);
    }
}

async function createConnection(context) {

    let conn;

    const opt = {
        user: context.auth.dbUser,
        host: context.auth.dbHost,
        database: context.auth.database,
        password: context.auth.dbPassword,
        dateStrings: true,
        supportBigNumbers: true
    };
    if (context.auth.dbPort) {
        opt.port = context.auth.dbPort;
    }

    conn = mysql.createConnection(opt);

    await new Promise((resolve, reject) => {
        conn.connect(err => {
            if (err) return reject(err);
            resolve();
        });
    });

    return conn;
}

async function runQuery(conn, query, params) {

    return await conn.query(query, params).stream({ highWaterMark: 10 });
}

/**
 * Validates a field name to prevent SQL injection.
 * Uses sqlstring.escapeId to safely escape the identifier and then
 * extracts the escaped name. This ensures only valid identifiers are used.
 * @param {string} fieldName - The field name to validate
 * @returns {string} - The original field name if valid
 * @throws {Error} - If the field name is invalid
 */
function validateIdentifier(fieldName) {

    if (!fieldName || typeof fieldName !== 'string') {
        throw new Error('Invalid identifier: field name must be a non-empty string');
    }

    // Trim whitespace
    const trimmed = fieldName.trim();

    if (trimmed.length === 0) {
        throw new Error('Invalid identifier: field name cannot be empty');
    }

    // Use sqlstring.escapeId to escape the identifier, then verify it's a simple identifier
    // Valid MySQL identifiers: alphanumeric, underscore, and can start with underscore or letter
    // We use a strict pattern that allows only safe characters
    const validIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    if (!validIdentifierPattern.test(trimmed)) {
        throw new Error(`Invalid identifier: "${trimmed}" contains invalid characters. ` +
            'Only letters, numbers, and underscores are allowed, and it must start with a letter or underscore.');
    }

    return trimmed;
}

/**
 * Validates a comma-separated list of field names.
 * @param {string} referenceFields - Comma-separated list of field names
 * @returns {string[]} - Array of validated field names
 */
function validateReferenceFields(referenceFields) {

    if (!referenceFields || typeof referenceFields !== 'string') {
        return [];
    }

    const trimmed = referenceFields.trim();
    if (trimmed.length === 0) {
        return [];
    }

    const fields = trimmed.split(',').map(field => field.trim()).filter(field => field.length > 0);

    // Validate each field
    return fields.map(field => validateIdentifier(field));
}

module.exports = {

    StreamProcessor,

    createQueryProcessor(context, storeId, query, params, lock) {

        return async (callback) => {

            let conn;
            try {
                conn = await createConnection(context);
                const stream = await runQuery(conn, query, params);
                const concurrency = parseInt(context.config.concurrency, 10) || 100;

                const streamProcessor = new StreamProcessor(context);
                streamProcessor.onBatchProcessed(() => {
                    lock.extend(parseInt(context.config.lockExtendTime, 10) || 1000 * 60 * 2);
                });

                await streamProcessor.processStream(conn, stream, callback, concurrency);
            } finally {
                if (conn) {
                    conn.end();
                }
            }
        };
    },

    async ensureStore(context, storeId, storeName) {

        const stateStoreId = await context.stateGet('storeId');
        let returnStoreId = storeId || stateStoreId;

        if (!storeId) {
            try {
                const newStoreResponse = await context.callAppmixer({
                    endPoint: '/stores',
                    method: 'POST',
                    body: {
                        name: storeName
                    }
                });
                returnStoreId = newStoreResponse.storeId;
            } catch (err) {
                // Ignore error if the store already exists
                if (!err.message.includes('duplicate key error')) {
                    throw err;
                }
                const stores = await context.callAppmixer({
                    endPoint: '/stores',
                    method: 'GET'
                });
                const selectedStore = stores.find(store => store.name === storeName);
                returnStoreId = selectedStore.storeId;
            }
        }

        await context.stateSet('storeId', returnStoreId);
        return returnStoreId;
    },

    runQuery,

    validateIdentifier,

    validateReferenceFields,

    sqlstring
};
