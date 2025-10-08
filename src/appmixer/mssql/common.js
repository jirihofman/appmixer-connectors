'use strict';
const mssql = require('mssql');
const EventEmitter = require('events');

class StreamProcessor {

    constructor(context) {

        this.eventEmitter = new EventEmitter();
        this.context = context;
    }

    processStream(queryStream, processCb, concurrency = 1) {

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
                .on('row', async (row) => {
                    const promise = processCallback(row);
                    promises.push(promise);
                    if (promises.length >= concurrency) {
                        queryStream.pause();
                        this.eventEmitter.emit('batchProcessed');
                        await Promise.all(promises);
                        promises = [];
                        queryStream.resume();
                    }
                })
                .on('done', async () => {
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

    const opt = {
        user: context.dbUser,
        server: context.dbHost,
        database: context.database,
        password: context.dbPassword,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        },
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    };
    return await mssql.connect(opt);
}

async function runQuery({ context, query, params = [], stream = false }) {

    const conn = await createConnection(context);
    const request = new mssql.Request(conn);
    request.stream = stream;

    // Add parameters to the request if provided
    if (params && params.length > 0) {
        params.forEach((param, index) => {
            // Use @p1, @p2, etc. as parameter names
            request.input(`p${index + 1}`, param);
        });
    }

    if (stream) {
        request.query(query);
        return request;
    } else {
        return await request.query(query);
    }
}

// Safe operators whitelist for query filtering
const SAFE_OPERATORS = new Set([
    '=', '!=', '<>', '<', '<=', '>', '>=',
    'CONTAINS', 'NOT CONTAINS', 'STARTS WITH', 'NOT STARTS WITH',
    'ENDS WITH', 'NOT ENDS WITH', 'IN', 'NOT IN',
    'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'
]);

module.exports = {

    StreamProcessor,

    createQueryProcessor(context, storeId, query, params, lock) {

        return async (callback) => {

            let conn;
            try {

                const stream = await runQuery({ context: context.auth, query, params, stream: true });
                const concurrency = parseInt(context.config.concurrency, 10) || 100;

                const streamProcessor = new StreamProcessor(context);
                streamProcessor.onBatchProcessed(() => {
                    lock.extend(parseInt(context.config.lockExtendTime, 10) || 1000 * 60 * 2);
                });

                await streamProcessor.processStream(stream, callback, concurrency);
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

    /**
     * Sanitizes and validates SQL operators to prevent SQL injection.
     * @param {string} operator - The operator to sanitize
     * @param {object} context - The component context (for error handling)
     * @returns {string} The sanitized operator in uppercase
     * @throws {CancelError} If the operator is not in the safe list
     */
    sanitizeOperator: (operator, context) => {
        const trimmedOperator = (operator ?? '').trim();
        const normalizedOperator = trimmedOperator.toUpperCase();

        if (!SAFE_OPERATORS.has(normalizedOperator)) {
            throw new context.CancelError(`Unsupported operator "${operator}"`);
        }

        return normalizedOperator;
    },

    /**
     * Escapes a SQL Server identifier (table name, column name, schema name, etc.)
     * to prevent SQL injection by wrapping it in square brackets.
     * @param {string} identifier - The identifier to escape
     * @returns {string} The escaped identifier wrapped in square brackets
     */
    escapeIdentifier: (identifier) => {
        // SQL Server uses square brackets for identifiers
        // Escape any existing square brackets by doubling them
        const escaped = identifier.replace(/\]/g, ']]');
        return `[${escaped}]`;
    },

    runQuery,
    createConnection,
    SAFE_OPERATORS
};
