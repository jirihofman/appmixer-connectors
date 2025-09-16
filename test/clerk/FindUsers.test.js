const fs = require('fs');
const { cwd } = require('process');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');

describe('Clerk FindUsers', () => {

    let context;
    let FindUsers;
    let lib;

    before(() => {
        // Stop if there are node modules installed in the connector folder.
        const connectorPath = cwd() + '/src/appmixer/clerk/node_modules';
        if (fs.existsSync(connectorPath)) {
            throw new Error(`For testing, please remove node_modules from ${connectorPath}`);
        }
        FindUsers = require('../../src/appmixer/clerk/core/FindUsers/FindUsers.js');
        lib = require('../../src/appmixer/clerk/lib.js');
    });

    beforeEach(() => {
        context = testUtils.createMockContext();
        context.auth = {
            apiKey: 'test_api_key'
        };
        context.messages = {
            in: {
                content: {}
            }
        };

        // Stub the lib function
        sinon.stub(lib, 'sendArrayOutput');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should find users with email query', async () => {
        context.messages.in.content = {
            emailAddress: 'john@example.com',
            outputType: 'array'
        };

        const mockUsers = [
            {
                id: 'user_123',
                first_name: 'John',
                last_name: 'Doe',
                email_addresses: [{ email_address: 'john@example.com' }]
            },
            {
                id: 'user_456',
                first_name: 'John',
                last_name: 'Smith',
                email_addresses: [{ email_address: 'john.smith@example.com' }]
            }
        ];

        context.httpRequest.resolves({ data: mockUsers });

        await FindUsers.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);

        assert.strictEqual(httpCall.args[0].method, 'GET');
        assert(httpCall.args[0].url.includes('https://api.clerk.com/v1/users'));
        assert(httpCall.args[0].url.includes('email_address_query=john%40example.com'));
        assert.strictEqual(httpCall.args[0].headers.Authorization, 'Bearer test_api_key');

        assert(lib.sendArrayOutput.calledOnce, 'lib.sendArrayOutput should be called once');
        const libCall = lib.sendArrayOutput.getCall(0);
        assert.deepStrictEqual(libCall.args[0].records, mockUsers);
        assert.strictEqual(libCall.args[0].outputType, 'array');
    });

    it('should find users with phone number query', async () => {
        context.messages.in.content = {
            phoneNumber: '+1234567890',
            outputType: 'object'
        };

        const mockUsers = [
            {
                id: 'user_789',
                first_name: 'Alice',
                phone_numbers: [{ phone_number: '+1234567890' }]
            }
        ];

        context.httpRequest.resolves({ data: mockUsers });

        await FindUsers.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);

        assert(httpCall.args[0].url.includes('phone_number_query=%2B1234567890'));

        assert(lib.sendArrayOutput.calledOnce, 'lib.sendArrayOutput should be called once');
        const libCall = lib.sendArrayOutput.getCall(0);
        assert.deepStrictEqual(libCall.args[0].records, mockUsers);
        assert.strictEqual(libCall.args[0].outputType, 'object');
    });

    it('should find users with username query', async () => {
        context.messages.in.content = {
            username: 'johndoe',
            outputType: 'first'
        };

        const mockUsers = [
            {
                id: 'user_abc',
                username: 'johndoe',
                first_name: 'John',
                last_name: 'Doe'
            }
        ];

        context.httpRequest.resolves({ data: mockUsers });

        await FindUsers.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);

        assert(httpCall.args[0].url.includes('username_query=johndoe'));

        assert(lib.sendArrayOutput.calledOnce, 'lib.sendArrayOutput should be called once');
        const libCall = lib.sendArrayOutput.getCall(0);
        assert.strictEqual(libCall.args[0].outputType, 'first');
    });

    it('should handle empty results', async () => {
        context.messages.in.content = {
            emailAddress: 'nonexistent@example.com',
            outputType: 'array'
        };

        context.httpRequest.resolves({ data: [] });

        await FindUsers.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(context.sendJson.calledOnce, 'sendJson should be called once for notFound');
        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], {});
        assert.strictEqual(sendJsonCall.args[1], 'notFound');
        assert(!lib.sendArrayOutput.called, 'lib.sendArrayOutput should not be called for empty results');
    });

    it('should handle multiple filters combined', async () => {
        context.messages.in.content = {
            emailAddress: 'john@example.com',
            username: 'johndoe',
            phoneNumber: '+1234567890',
            outputType: 'array'
        };

        const mockUsers = [
            {
                id: 'user_123',
                username: 'johndoe',
                first_name: 'John',
                last_name: 'Doe',
                email_addresses: [{ email_address: 'john@example.com' }],
                phone_numbers: [{ phone_number: '+1234567890' }]
            }
        ];

        context.httpRequest.resolves({ data: mockUsers });

        await FindUsers.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const url = httpCall.args[0].url;

        assert(url.includes('email_address_query=john%40example.com'));
        assert(url.includes('username_query=johndoe'));
        assert(url.includes('phone_number_query=%2B1234567890'));

        assert(lib.sendArrayOutput.calledOnce, 'lib.sendArrayOutput should be called once');
        const libCall = lib.sendArrayOutput.getCall(0);
        assert.deepStrictEqual(libCall.args[0].records, mockUsers);
    });

    it('should handle API errors', async () => {
        context.messages.in.content = {
            emailAddress: 'test@example.com',
            outputType: 'array'
        };

        const error = new Error('API rate limit exceeded');
        error.response = {
            status: 429,
            data: { message: 'Rate limit exceeded' }
        };

        context.httpRequest.rejects(error);

        try {
            await FindUsers.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'API rate limit exceeded');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!lib.sendArrayOutput.called, 'lib.sendArrayOutput should not be called on error');
    });

    it('should default to array output type when not specified', async () => {
        context.messages.in.content = {
            emailAddress: 'test@example.com'
            // outputType not specified - should default to 'array'
        };

        const mockUsers = [{ id: 'user_1', first_name: 'Test' }];

        context.httpRequest.resolves({ data: mockUsers });

        await FindUsers.receive(context);

        const libCall = lib.sendArrayOutput.getCall(0);
        assert.strictEqual(libCall.args[0].outputType, 'array');
    });

    it('should handle file output type', async () => {
        context.messages.in.content = {
            username: 'testuser',
            outputType: 'file'
        };

        const mockUsers = [
            { id: 'user_1', first_name: 'John', last_name: 'Doe' },
            { id: 'user_2', first_name: 'Jane', last_name: 'Smith' }
        ];

        context.httpRequest.resolves({ data: mockUsers });

        await FindUsers.receive(context);

        const libCall = lib.sendArrayOutput.getCall(0);
        assert.strictEqual(libCall.args[0].outputType, 'file');
        assert.deepStrictEqual(libCall.args[0].records, mockUsers);
    });

    it('should handle output port options generation', async () => {
        context.properties = {
            generateOutputPortOptions: true
        };
        context.messages.in.content = {
            outputType: 'object'
        };

        // Restore the existing stub and create a new one
        lib.sendArrayOutput.restore();
        sinon.stub(lib, 'getOutputPortOptions').returns('mocked options');

        const result = await FindUsers.receive(context);

        assert.strictEqual(result, 'mocked options');
        assert(lib.getOutputPortOptions.calledOnce, 'lib.getOutputPortOptions should be called once');
        assert(!context.httpRequest.called, 'httpRequest should not be called when generating options');
    });
});
