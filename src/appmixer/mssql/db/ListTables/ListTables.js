'use strict';

const mssql = require('mssql');
const { runQuery } = require('../../common');

module.exports = {

    async receive(context) {

        // Use parameterized query to prevent SQL injection
        // Note: is_ms_shipped = 0 filters out system tables
        const query = 'SELECT name FROM sys.tables WHERE is_ms_shipped = @p1;';
        const params = [0];

        try {
            const tables = await runQuery({ context: context.auth, query, params, stream: false });
            await context.sendJson({ tables }, 'tables');
        } finally {
            mssql.close();
        }
    }
};

