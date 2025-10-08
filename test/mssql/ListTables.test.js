'use strict';

const assert = require('assert');
const path = require('path');
const sinon = require('sinon');
const { createMockContext } = require('../utils');

const componentPath = path.join(__dirname, '../../src/appmixer/mssql/db/ListTables/ListTables.js');
const commonPath = path.join(__dirname, '../../src/appmixer/mssql/common.js');

describe('mssql/ListTables - SQL Injection Protection', () => {

    let originalCommonModule;
    let listTables;
    let commonStub;

    beforeEach(() => {
        const commonResolve = require.resolve(commonPath);
        originalCommonModule = require.cache[commonResolve];

        commonStub = {
            runQuery: sinon.stub().resolves({ recordset: [{ name: 'users' }, { name: 'orders' }] })
        };

        require.cache[commonResolve] = {
            id: commonResolve,
            filename: commonResolve,
            loaded: true,
            exports: commonStub
        };

        delete require.cache[require.resolve(componentPath)];
        listTables = require(componentPath);
    });

    afterEach(() => {
        const commonResolve = require.resolve(commonPath);
        delete require.cache[commonResolve];
        if (originalCommonModule) {
            require.cache[commonResolve] = originalCommonModule;
        }
        delete require.cache[require.resolve(componentPath)];
        sinon.restore();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
        const context = createMockContext({
            auth: { dbUser: 'user', dbHost: 'host', database: 'db', dbPassword: 'pass' },
            sendJson: sinon.stub()
        });

        await listTables.receive(context);

        assert.strictEqual(commonStub.runQuery.calledOnce, true, 'Expected query to be executed once');
        const callArgs = commonStub.runQuery.firstCall.args[0];

        assert.strictEqual(callArgs.query.includes('@p1'), true, 'Query should use parameter placeholder');
        assert.deepStrictEqual(callArgs.params, [0], 'Should pass 0 as parameter for is_ms_shipped');
        assert.strictEqual(callArgs.stream, false, 'Should not stream results');

        assert.strictEqual(context.sendJson.calledOnce, true);
        assert.deepStrictEqual(
            context.sendJson.firstCall.args,
            [{ tables: { recordset: [{ name: 'users' }, { name: 'orders' }] } }, 'tables']
        );
    });

    it('should not be vulnerable to SQL injection attempts', async () => {
        // Even though ListTables doesn't accept user input directly,
        // we verify it uses parameterized queries for best practices
        const context = createMockContext({
            auth: { dbUser: 'user', dbHost: 'host', database: 'db', dbPassword: 'pass' },
            sendJson: sinon.stub()
        });

        await listTables.receive(context);

        const callArgs = commonStub.runQuery.firstCall.args[0];

        // Verify the query doesn't use string concatenation
        assert.strictEqual(
            callArgs.query.includes('is_ms_shipped = @p1'),
            true,
            'Query should use parameterized value'
        );

        // Verify the literal 0 is not in the query string
        assert.strictEqual(
            callArgs.query.includes('is_ms_shipped = 0'),
            false,
            'Query should not contain literal 0'
        );
    });
});
