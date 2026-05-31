const fs = require('fs');
const { cwd } = require('process');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');

describe('Clerk CreateUser', () => {

    let context;
    let CreateUser;

    before(() => {
        // Stop if there are node modules installed in the connector folder.
        const connectorPath = cwd() + '/src/appmixer/clerk/node_modules';
        if (fs.existsSync(connectorPath)) {
            throw new Error(`For testing, please remove node_modules from ${connectorPath}`);
        }
        CreateUser = require('../../src/appmixer/clerk/core/CreateUser/CreateUser.js');
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
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should create user with basic required fields', async () => {
        context.messages.in.content = {
            firstName: 'John',
            lastName: 'Doe',
            emailAddresses: 'john@example.com'
        };

        const mockUser = {
            id: 'user_123',
            first_name: 'John',
            last_name: 'Doe',
            email_addresses: [{ email_address: 'john@example.com' }]
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);

        assert.strictEqual(httpCall.args[0].method, 'POST');
        assert.strictEqual(httpCall.args[0].url, 'https://api.clerk.com/v1/users');
        assert.strictEqual(httpCall.args[0].headers.Authorization, 'Bearer test_api_key');

        const requestBody = httpCall.args[0].data;
        assert.strictEqual(requestBody.first_name, 'John');
        assert.strictEqual(requestBody.last_name, 'Doe');
        assert.deepStrictEqual(requestBody.email_address, ['john@example.com']);

        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], mockUser);
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });

    it('should handle multiple email addresses from textarea input', async () => {
        context.messages.in.content = {
            firstName: 'Jane',
            emailAddresses: 'jane@example.com\nsecond@example.com\nthird@example.com'
        };

        const mockUser = {
            id: 'user_456',
            first_name: 'Jane',
            email_addresses: [
                { email_address: 'jane@example.com' },
                { email_address: 'second@example.com' },
                { email_address: 'third@example.com' }
            ]
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;

        assert.deepStrictEqual(requestBody.email_address, [
            'jane@example.com',
            'second@example.com',
            'third@example.com'
        ]);
    });

    it('should handle phone numbers as array', async () => {
        context.messages.in.content = {
            firstName: 'Bob',
            phoneNumbers: '+1234567890,+0987654321'
        };

        const mockUser = {
            id: 'user_789',
            first_name: 'Bob',
            phone_numbers: [
                { phone_number: '+1234567890' },
                { phone_number: '+0987654321' }
            ]
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;

        assert.deepStrictEqual(requestBody.phone_number, ['+1234567890', '+0987654321']);
    });

    it('should handle web3 wallets', async () => {
        context.messages.in.content = {
            firstName: 'Alice',
            username: 'alice_web3', // Need an identifier
            web3Wallets: '0x1234567890123456789012345678901234567890'
        };

        const mockUser = {
            id: 'user_abc',
            first_name: 'Alice',
            username: 'alice_web3',
            web3_wallets: [{ web3_wallet: '0x1234567890123456789012345678901234567890' }]
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;

        assert.deepStrictEqual(requestBody.web3_wallet, ['0x1234567890123456789012345678901234567890']);
    });

    it('should handle optional string fields', async () => {
        context.messages.in.content = {
            externalId: 'ext_123',
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            password: 'secretpassword',
            emailAddresses: 'test@example.com'
        };

        const mockUser = {
            id: 'user_test',
            external_id: 'ext_123',
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;

        assert.strictEqual(requestBody.external_id, 'ext_123');
        assert.strictEqual(requestBody.first_name, 'Test');
        assert.strictEqual(requestBody.last_name, 'User');
        assert.strictEqual(requestBody.username, 'testuser');
        assert.strictEqual(requestBody.password, 'secretpassword');
    });

    it('should handle boolean deleteSelfEnabled field', async () => {
        context.messages.in.content = {
            firstName: 'Test',
            emailAddresses: 'test@example.com',
            deleteSelfEnabled: true
        };

        const mockUser = {
            id: 'user_test',
            first_name: 'Test',
            delete_self_enabled: true
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;

        assert.strictEqual(requestBody.delete_self_enabled, true);
    });

    it('should handle empty/undefined array fields gracefully', async () => {
        context.messages.in.content = {
            firstName: 'Test',
            username: 'testuser', // Need an identifier to avoid validation error
            emailAddresses: '', // empty string
            phoneNumbers: null, // null
            web3Wallets: undefined // undefined
        };

        const mockUser = {
            id: 'user_test',
            first_name: 'Test',
            username: 'testuser'
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;

        // Should not include empty array fields
        assert(!requestBody.hasOwnProperty('email_address'));
        assert(!requestBody.hasOwnProperty('phone_number'));
        assert(!requestBody.hasOwnProperty('web3_wallet'));
        assert.strictEqual(requestBody.first_name, 'Test');
        assert.strictEqual(requestBody.username, 'testuser');
    });

    it('should throw validation error when no identifier provided', async () => {
        context.messages.in.content = {
            firstName: 'Test'
            // No email, phone, username, or externalId
        };

        try {
            await CreateUser.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'At least one identifier must be provided: email address, phone number, username, or external ID');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called on validation error');
        assert(!context.sendJson.called, 'sendJson should not be called on validation error');
    });

    it('should handle API errors', async () => {
        context.messages.in.content = {
            firstName: 'Test',
            emailAddresses: 'invalid-email'
        };

        const error = new Error('Invalid email format');
        error.response = {
            status: 400,
            data: { message: 'Invalid email format' }
        };

        context.httpRequest.rejects(error);

        try {
            await CreateUser.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Invalid email format');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should filter out empty strings from array fields', async () => {
        context.messages.in.content = {
            firstName: 'Test',
            emailAddresses: 'valid@example.com\n\n\nother@example.com\n',
            phoneNumbers: '+1234567890,,+0987654321,'
        };

        const mockUser = {
            id: 'user_test',
            first_name: 'Test'
        };

        context.httpRequest.resolves({ data: mockUser });

        await CreateUser.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;

        // Should filter out empty strings
        assert.deepStrictEqual(requestBody.email_address, ['valid@example.com', 'other@example.com']);
        assert.deepStrictEqual(requestBody.phone_number, ['+1234567890', '+0987654321']);
    });
});
