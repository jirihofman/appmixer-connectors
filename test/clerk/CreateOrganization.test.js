const fs = require('fs');
const { cwd } = require('process');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');

describe('Clerk CreateOrganization', () => {

    let context;
    let CreateOrganization;

    before(() => {
        // Stop if there are node modules installed in the connector folder.
        const connectorPath = cwd() + '/src/appmixer/clerk/node_modules';
        if (fs.existsSync(connectorPath)) {
            throw new Error(`For testing, please remove node_modules from ${connectorPath}`);
        }
        CreateOrganization = require('../../src/appmixer/clerk/core/CreateOrganization/CreateOrganization.js');
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

    it('should create organization with required name', async () => {
        context.messages.in.content = {
            name: 'Test Organization'
        };

        const mockOrganization = {
            id: 'org_123',
            name: 'Test Organization',
            slug: 'test-organization',
            public_metadata: {},
            private_metadata: {},
            created_at: 1234567890,
            updated_at: 1234567890
        };

        context.httpRequest.resolves({ data: mockOrganization });

        await CreateOrganization.receive(context);

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        const httpCall = context.httpRequest.getCall(0);
        
        assert.strictEqual(httpCall.args[0].method, 'POST');
        assert.strictEqual(httpCall.args[0].url, 'https://api.clerk.com/v1/organizations');
        assert.strictEqual(httpCall.args[0].headers.Authorization, 'Bearer test_api_key');
        
        const requestBody = httpCall.args[0].data;
        assert.strictEqual(requestBody.name, 'Test Organization');

        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], mockOrganization);
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });

    it('should throw CancelError when name is missing', async () => {
        context.messages.in.content = {}; // No name provided

        try {
            await CreateOrganization.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'Missing required input: name');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when name is missing');
        assert(!context.sendJson.called, 'sendJson should not be called when name is missing');
    });

    it('should throw CancelError when name is empty string', async () => {
        context.messages.in.content = { name: '' }; // Empty string

        try {
            await CreateOrganization.receive(context);
            assert.fail('Should have thrown CancelError');
        } catch (err) {
            assert(err instanceof context.CancelError);
            assert.strictEqual(err.message, 'Missing required input: name');
        }

        assert(!context.httpRequest.called, 'httpRequest should not be called when name is empty');
        assert(!context.sendJson.called, 'sendJson should not be called when name is empty');
    });

    it('should handle optional parameters', async () => {
        context.messages.in.content = {
            name: 'Another Organization',
            slug: 'another-org',
            max_allowed_memberships: 100
        };

        const mockOrganization = {
            id: 'org_456',
            name: 'Another Organization',
            slug: 'another-org',
            max_allowed_memberships: 100,
            public_metadata: {},
            private_metadata: {}
        };

        context.httpRequest.resolves({ data: mockOrganization });

        await CreateOrganization.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;
        
        assert.strictEqual(requestBody.name, 'Another Organization');
        assert.strictEqual(requestBody.slug, 'another-org');
        assert.strictEqual(requestBody.max_allowed_memberships, 100);
    });

    it('should handle API errors', async () => {
        context.messages.in.content = {
            name: 'Error Organization'
        };

        const error = new Error('Organization name already exists');
        error.response = {
            status: 422,
            data: { message: 'Organization name already exists' }
        };

        context.httpRequest.rejects(error);

        try {
            await CreateOrganization.receive(context);
            assert.fail('Should have thrown error');
        } catch (err) {
            assert.strictEqual(err.message, 'Organization name already exists');
        }

        assert(context.httpRequest.calledOnce, 'httpRequest should be called once');
        assert(!context.sendJson.called, 'sendJson should not be called on error');
    });

    it('should handle organization with all optional fields', async () => {
        context.messages.in.content = {
            name: 'Complete Organization',
            slug: 'complete-org',
            max_allowed_memberships: 50
        };

        const mockOrganization = {
            id: 'org_complete',
            name: 'Complete Organization',
            slug: 'complete-org',
            max_allowed_memberships: 50,
            created_at: 1234567890,
            updated_at: 1234567890,
            members_count: 1
        };

        context.httpRequest.resolves({ data: mockOrganization });

        await CreateOrganization.receive(context);

        const httpCall = context.httpRequest.getCall(0);
        const requestBody = httpCall.args[0].data;
        
        assert.strictEqual(requestBody.name, 'Complete Organization');
        assert.strictEqual(requestBody.slug, 'complete-org');
        assert.strictEqual(requestBody.max_allowed_memberships, 50);

        assert(context.sendJson.calledOnce, 'sendJson should be called once');
        const sendJsonCall = context.sendJson.getCall(0);
        assert.deepStrictEqual(sendJsonCall.args[0], mockOrganization);
        assert.strictEqual(sendJsonCall.args[1], 'out');
    });
});