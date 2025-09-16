const fs = require('fs');
const { cwd } = require('process');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');

describe('Clerk DeleteUser', () => {

    let context;
    let DeleteUser;

    before(() => {
        // Stop if there are node modules installed in the connector folder.
        const connectorPath = cwd() + '/src/appmixer/clerk/node_modules';
        if (fs.existsSync(connectorPath)) {
            throw new Error(`For testing, please remove node_modules from ${connectorPath}`);
        }
        DeleteUser = require('../../src/appmixer/clerk/core/DeleteUser/DeleteUser.js');
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

    it('should delete user successfully', async () => {
        const userId = 'user_123';
        context.messages.in.content = { id: userId };

        // Delete typically returns empty response on success
        context.httpRequest.resolves({ data: {} });

        await DeleteUser.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);
        
        assert.strictEqual(httpCall.args[0].method, 'DELETE');
        assert.strictEqual(httpCall.args[0].url, `https://api.clerk.com/v1/users/${userId}`);
        assert.strictEqual(httpCall.args[0].headers.Authorization, 'Bearer test_api_key');

        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], {});
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });

    it('should throw CancelError when id is missing', async () => {
        context.messages.in.content = {}; // No id provided

        try {
            await DeleteUser.receive(context);
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
            await DeleteUser.receive(context);
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
            await DeleteUser.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'User ID is required');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when id is null');
        assert(!context.sendJson.called, 'sendJson should not be called when id is null');
    });

    it('should handle 404 error when user not found', async () => {
        const userId = 'user_not_found';
        context.messages.in.content = { id: userId };

        const error = new Error('User not found');
        error.response = {
            status: 404,
            data: { message: 'User not found' }
        };

        context.httpRequest.rejects(error);

        try {
            await DeleteUser.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'User not found');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle permission error', async () => {
        const userId = 'user_forbidden';
        context.messages.in.content = { id: userId };

        const error = new Error('Insufficient permissions');
        error.response = {
            status: 403,
            data: { message: 'Insufficient permissions to delete user' }
        };

        context.httpRequest.rejects(error);

        try {
            await DeleteUser.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Insufficient permissions');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle successful deletion with user data returned', async () => {
        const userId = 'user_456';
        context.messages.in.content = { id: userId };

        // Some APIs return the deleted user data, but our component always returns empty object
        const deletedUser = {
            id: 'user_456',
            first_name: 'Deleted',
            last_name: 'User',
            deleted: true
        };

        context.httpRequest.resolves({ data: deletedUser });

        await DeleteUser.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        
        const sendJsonCall = context.sendJson.getCall(0);
        // Component always returns empty object regardless of API response
        assert.deepStrictEqual(sendJsonCall.args[0], {});
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });

    it('should handle rate limit error', async () => {
        const userId = 'user_rate_limited';
        context.messages.in.content = { id: userId };

        const error = new Error('Rate limit exceeded');
        error.response = {
            status: 429,
            data: { message: 'Too many requests' }
        };

        context.httpRequest.rejects(error);

        try {
            await DeleteUser.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Rate limit exceeded');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });
});