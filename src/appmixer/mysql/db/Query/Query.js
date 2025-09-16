'use strict';

const mysql = require('mysql');
const { stringify } = require('csv-stringify');
const { runQuery } = require('../../common');

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML special characters
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
function sanitizeForOutput(str) {
    if (typeof str !== 'string') {
        return str;
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validates SQL query input to prevent basic injection patterns
 * @param {string} query - The SQL query to validate
 * @throws {Error} - If query contains suspicious patterns
 */
function validateSQLQuery(query) {
    if (!query || typeof query !== 'string') {
        throw new Error('Query must be a non-empty string');
    }

    // Trim whitespace
    query = query.trim();

    if (query.length === 0) {
        throw new Error('Query cannot be empty');
    }

    // Check for potential SQL injection patterns (basic validation)
    const suspiciousPatterns = [
        /;\s*(drop|delete|truncate|insert|update|alter|create|exec|execute)\s+/gi,
        /union\s+select/gi,
        /;\s*--/gi,
        /\/\*.*\*\//gi
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(query)) {
            throw new Error('Query contains potentially unsafe SQL patterns');
        }
    }

    return query;
}

module.exports = {

    async receive(context) {

        if (context.properties.generateOutputPortOptions) {
            return this.getOutputPortOptions(context, context.messages.in.content.outputType);
        }

        const { query: rawQuery, outputType } = context.messages.in.content;

        // Validate and sanitize the query input
        let query;
        try {
            query = validateSQLQuery(rawQuery);
        } catch (error) {
            throw new context.CancelError(`Invalid query: ${sanitizeForOutput(error.message)}`);
        }

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

            const queryStream = await runQuery(conn, query, []);

            if (outputType === 'file') {
                const stringifier = stringify({ header: true });
                const savedFile = await context.saveFileStream('result.csv', queryStream.pipe(stringifier));
                if (!savedFile.length) {
                    await context.sendJson({
                        query: sanitizeForOutput(query),
                        messages: 'No data returned for the query.'
                    }, 'emptyResult');
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
                                    query: sanitizeForOutput(query),
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
