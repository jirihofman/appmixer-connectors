const fs = require('fs');
const { cwd } = require('process');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');

describe('Clerk GetUser', () => {

    let context;
    let GetUser;

    before(() => {
        // Stop if there are node modules installed in the connector folder.
        const connectorPath = cwd() + '/src/appmixer/clerk/node_modules';
        if (fs.existsSync(connectorPath)) {
            throw new Error(`For testing, please remove node_modules from ${connectorPath}`);
        }
        GetUser = require('../../src/appmixer/clerk/core/GetUser/GetUser.js');
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

    it('should get user by id successfully', async () => {
        const userId = 'user_123';
        context.messages.in.content = { id: userId };

        const mockUser = {
            id: 'user_123',
            first_name: 'John',
            last_name: 'Doe',
            email_addresses: [
                { email_address: 'john@example.com', id: 'email_123' }
            ],
            created_at: 1234567890,
            updated_at: 1234567891
        };

        context.httpRequest.resolves({ data: mockUser });

        await GetUser.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);

        assert.strictEqual(httpCall.args[0].method, 'GET');
        assert.strictEqual(httpCall.args[0].url, `https://api.clerk.com/v1/users/${userId}`);
        assert.strictEqual(httpCall.args[0].headers.Authorization, 'Bearer test_api_key');

        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], mockUser);
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });

    it('should throw CancelError when id is missing', async () => {
        context.messages.in.content = {}; // No id provided

        try {
            await GetUser.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'User ID is required');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when id is missing');
        assert(!context.sendJson.called, 'sendJson should not be called when id is missing');
    });

    it('should throw CancelError when id is empty string', async () => {
        context.messages.in.content = { id: '' }; // Empty string

        try {
            await GetUser.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'User ID is required');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when id is empty');
        assert(!context.sendJson.called, 'sendJson should not be called when id is empty');
    });

    it('should throw CancelError when id is null', async () => {
        context.messages.in.content = { id: null }; // null value

        try {
            await GetUser.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'User ID is required');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when id is null');
        assert(!context.sendJson.called, 'sendJson should not be called when id is null');
    });

    it('should handle API errors gracefully', async () => {
        const userId = 'user_not_found';
        context.messages.in.content = { id: userId };

        const error = new Error('User not found');
        error.response = {
            status: 404,
            data: { message: 'User not found' }
        };

        context.httpRequest.rejects(error);

        try {
            await GetUser.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'User not found');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle user with minimal data', async () => {
        const userId = 'user_minimal';
        context.messages.in.content = { id: userId };

        const mockUser = {
            id: 'user_minimal',
            object: 'user',
            created_at: 1234567890
        };

        context.httpRequest.resolves({ data: mockUser });

        await GetUser.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(context.sendJson.calledOnce, 'sendJson should be called once');

        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], mockUser);
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });

    it('should handle user with complete profile data', async () => {
        const userId = 'user_complete';
        context.messages.in.content = { id: userId };

        const mockUser = {
            id: 'user_complete',
            object: 'user',
            username: 'johnsmith',
            first_name: 'John',
            last_name: 'Smith',
            image_url: 'https://example.com/avatar.jpg',
            has_image: true,
            primary_email_address_id: 'email_primary',
            primary_phone_number_id: 'phone_primary',
            primary_web3_wallet_id: null,
            password_enabled: true,
            two_factor_enabled: false,
            totp_enabled: false,
            backup_code_enabled: false,
            external_id: 'ext_123',
            email_addresses: [
                {
                    id: 'email_primary',
                    object: 'email_address',
                    email_address: 'john@example.com',
                    verification: { status: 'verified', attempts: 1 },
                    linked_to: []
                }
            ],
            phone_numbers: [
                {
                    id: 'phone_primary',
                    object: 'phone_number',
                    phone_number: '+1234567890',
                    verification: { status: 'verified', attempts: 1 },
                    linked_to: []
                }
            ],
            web3_wallets: [],
            external_accounts: [],
            created_at: 1234567890,
            updated_at: 1234567891,
            last_sign_in_at: 1234567892,
            banned: false,
            locked: false,
            lockout_expires_in_seconds: null,
            verification_attempts_remaining: 3,
            delete_self_enabled: true,
            create_organization_enabled: false,
            public_metadata: {},
            private_metadata: {},
            unsafe_metadata: {}
        };

        context.httpRequest.resolves({ data: mockUser });

        await GetUser.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(context.sendJson.calledOnce, 'sendJson should be called once');

        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], mockUser);
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });
});
