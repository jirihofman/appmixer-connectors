const fs = require('fs');
const { cwd } = require('process');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');

describe('Clerk RevokeSession', () => {

    let context;
    let RevokeSession;

    before(() => {
        // Stop if there are node modules installed in the connector folder.
        const connectorPath = cwd() + '/src/appmixer/clerk/node_modules';
        if (fs.existsSync(connectorPath)) {
            throw new Error(`For testing, please remove node_modules from ${connectorPath}`);
        }
        RevokeSession = require('../../src/appmixer/clerk/core/RevokeSession/RevokeSession.js');
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

    it('should revoke session successfully', async () => {
        const sessionId = 'sess_123';
        context.messages.in.content = { id: sessionId };

        // Component doesn't use the response data, just checks for success
        context.httpRequest.resolves({ data: {} });

        await RevokeSession.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);
        
        assert.strictEqual(httpCall.args[0].method, 'POST');
        assert.strictEqual(httpCall.args[0].url, `https://api.clerk.com/v1/sessions/${sessionId}/revoke`);
        assert.strictEqual(httpCall.args[0].headers.Authorization, 'Bearer test_api_key');

        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], {});
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });

    it('should throw CancelError when id is missing', async () => {
        context.messages.in.content = {}; // No id provided

        try {
            await RevokeSession.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'Session ID is required');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when id is missing');
        assert(!context.sendJson.called, 'sendJson should not be called when id is missing');
    });

    it('should throw CancelError when id is empty string', async () => {
        context.messages.in.content = { id: '' }; // Empty string

        try {
            await RevokeSession.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'Session ID is required');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when id is empty');
        assert(!context.sendJson.called, 'sendJson should not be called when id is empty');
    });

    it('should throw CancelError when id is null', async () => {
        context.messages.in.content = { id: null }; // null value

        try {
            await RevokeSession.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'Session ID is required');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when id is null');
        assert(!context.sendJson.called, 'sendJson should not be called when id is null');
    });

    it('should handle 404 error when session not found', async () => {
        const sessionId = 'sess_not_found';
        context.messages.in.content = { id: sessionId };

        const error = new Error('Session not found');
        error.response = {
            status: 404,
            data: { message: 'Session not found' }
        };

        context.httpRequest.rejects(error);

        try {
            await RevokeSession.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Session not found');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle already revoked session', async () => {
        const sessionId = 'sess_already_revoked';
        context.messages.in.content = { id: sessionId };

        const error = new Error('Session already revoked');
        error.response = {
            status: 400,
            data: { message: 'Session is already inactive' }
        };

        context.httpRequest.rejects(error);

        try {
            await RevokeSession.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Session already revoked');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle permission error', async () => {
        const sessionId = 'sess_forbidden';
        context.messages.in.content = { id: sessionId };

        const error = new Error('Insufficient permissions');
        error.response = {
            status: 403,
            data: { message: 'Insufficient permissions to revoke session' }
        };

        context.httpRequest.rejects(error);

        try {
            await RevokeSession.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Insufficient permissions');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle rate limit error', async () => {
        const sessionId = 'sess_rate_limited';
        context.messages.in.content = { id: sessionId };

        const error = new Error('Rate limit exceeded');
        error.response = {
            status: 429,
            data: { message: 'Too many requests' }
        };

        context.httpRequest.rejects(error);

        try {
            await RevokeSession.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Rate limit exceeded');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle session with detailed response', async () => {
        const sessionId = 'sess_detailed';
        context.messages.in.content = { id: sessionId };

        // Even with detailed response, component returns empty object
        const mockSession = {
            id: 'sess_detailed',
            object: 'session',
            status: 'revoked',
            user_id: 'user_detailed',
            client_id: 'client_detailed',
            created_at: 1234567890,
            updated_at: 1234567891,
            expire_at: 1234567999,
            abandon_at: 1234568000,
            last_active_at: 1234567895,
            last_active_organization_id: 'org_123'
        };

        context.httpRequest.resolves({ data: mockSession });

        await RevokeSession.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        
        const sendJsonCall = context.sendJson.getCall(0);
        // Component always returns empty object regardless of API response
        assert.deepStrictEqual(sendJsonCall.args[0], {});
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });
});