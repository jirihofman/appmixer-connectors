'use strict';

const mysql = require('mysql');
const { stringify } = require('csv-stringify');
const { runQuery } = require('../../common');

/**
 * Validates SQL query to prevent dangerous SQL injection patterns
 * @param {string} query - The SQL query to validate
 * @throws {Error} If query contains dangerous patterns
 */
function validateQuery(query) {
    if (!query || typeof query !== 'string') {
        throw new Error('Query must be a non-empty string');
    }

    // Trim first to check if it's empty after removing whitespace
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        throw new Error('Query must be a non-empty string');
    }

    // Remove comments and normalize whitespace
    const normalizedQuery = query
        .replace(/--.*$/gm, '') // Remove line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    // Check for dangerous patterns that could indicate SQL injection
    const dangerousPatterns = [
        /;\s*(drop|alter|truncate|create|delete|insert|update)\s+/,
        /union\s+select/,
        /exec\s*\(/,
        /xp_\w+/,
        /sp_\w+/,
        /into\s+outfile/,
        /load_file\s*\(/,
        /benchmark\s*\(/
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(normalizedQuery)) {
            throw new Error(`Query contains potentially dangerous pattern: ${pattern.source}`);
        }
    }
}

module.exports = {

    async receive(context) {

        if (context.properties.generateOutputPortOptions) {
            return this.getOutputPortOptions(context, context.messages.in.content.outputType);
        }

        const { query, params: rawParams, outputType } = context.messages.in.content;

        // Validate required parameters
        if (!query) {
            throw new context.CancelError('Query is required.');
        }

        if (!outputType) {
            throw new context.CancelError('Output type is required.');
        }

        // Parse parameters if provided
        let params = [];
        if (rawParams) {
            try {
                if (typeof rawParams === 'string') {
                    params = JSON.parse(rawParams);
                } else if (Array.isArray(rawParams)) {
                    params = rawParams;
                } else {
                    throw new Error('Parameters must be a JSON array or array');
                }
            } catch (error) {
                throw new context.CancelError(`Invalid parameters format: ${error.message}`);
            }
        }

        // Validate the query for basic SQL injection patterns
        try {
            validateQuery(query);
        } catch (error) {
            throw new context.CancelError(`Query validation failed: ${error.message}`);
        }

        // Format query with parameters if provided (this safely escapes parameters)
        const finalQuery = params.length > 0 ? mysql.format(query, params) : query;

        const connectionOptions = {
            user: context.auth.dbUser,
            host: context.auth.dbHost,
            database: context.auth.database,
            password: context.auth.dbPassword,
            port: context.auth.dbPort || 3306 // Default MySQL port
        };

        let conn;
        let hasData = false;

        try {
            conn = mysql.createConnection(connectionOptions);

            await new Promise((resolve, reject) => {
                conn.connect(err => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            // Use the formatted query with proper escaping
            const queryStream = await runQuery(conn, finalQuery, []);

            if (outputType === 'file') {
                const stringifier = stringify({ header: true });
                const savedFile = await context.saveFileStream('result.csv', queryStream.pipe(stringifier));
                if (!savedFile.length) {
                    await context.sendJson({ query: finalQuery, messages: 'No data returned for the query.' }, 'emptyResult');
                }
                await context.sendJson({ fileId: savedFile.fileId }, 'out');
            } else {
                let index = 0;
                const rows = [];

                await new Promise((resolve, reject) => {
                    queryStream.on('data', async (row) => {
                        hasData = true;
                        if (outputType === 'row') {
                            await context.sendJson({ row, index: index++ }, 'out');
                        } else if (outputType === 'rows') {
                            rows.push(row);
                        } else {
                            throw new Error('Unsupported outputType ' + outputType);
                        }
                    });

                    queryStream.on('error', (err) => reject(err));

                    queryStream.on('end', async () => {
                        if (!hasData) {
                            await context.sendJson(
                                {
                                    query: finalQuery,
                                    messages: 'No data returned for the query.'
                                },
                                'emptyResult'
                            );
                        }
                        resolve();
                    });
                });

                if (outputType === 'rows') {
                    await context.sendJson({ rows }, 'out');
                }
            }
        } finally {
            if (conn) {
                conn.end();
            }
        }
    },

    getOutputPortOptions(context, outputType) {

        if (outputType === 'row') {
            return context.sendJson([{ label: 'Row', value: 'row' }, { label: 'Index', value: 'index' }], 'out');
        } else if (outputType === 'rows') {
            return context.sendJson([{ label: 'Rows', value: 'rows' }], 'out');
        } else {
            // file
            return context.sendJson([{ label: 'File ID', value: 'fileId' }], 'out');
        }
    }
};
