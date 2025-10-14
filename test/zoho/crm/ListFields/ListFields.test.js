const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../../../utils.js');
const action = require('../../../../src/appmixer/zoho/crm/ListFields/ListFields.js');

describe('Zoho CRM ListFields', function() {

    const context = testUtils.createMockContext();

    beforeEach(function() {
        sinon.reset();
        // Set required profileInfo for Zoho
        context.profileInfo = {
            region: 'com',
            fullname: 'Test User'
        };
        context.auth = {
            accessToken: 'test-access-token'
        };
        // Mock httpRequest.create for ZohoClient
        context.httpRequest.create = sinon.stub().returns(context.httpRequest);
    });

    describe('receive', function() {

        const fixtureFieldsData = [
            { api_name: 'field1', field_label: 'Field 1' },
            { api_name: 'field2', field_label: 'Field 2' },
            { api_name: 'field3', field_label: 'Field 3' }
        ];

        beforeEach(function() {
            context.messages = {
                in: {
                    content: {
                        moduleName: 'Contacts'
                    }
                }
            };

            // Mock ZohoClient.getFields
            const ZohoClient = require('../../../../src/appmixer/zoho/ZohoClient');
            sinon.stub(ZohoClient.prototype, 'getFields').resolves(fixtureFieldsData);
        });

        afterEach(function() {
            // Restore the stub
            const ZohoClient = require('../../../../src/appmixer/zoho/ZohoClient');
            ZohoClient.prototype.getFields.restore();
        });

        it('should fetch fields and cache them with proper locking', async function() {
            // First call to staticCache.get should return null
            context.staticCache.get.onFirstCall().resolves(null);

            await action.receive(context);

            // Verify lock was acquired
            assert.equal(context.lock.callCount, 1);
            assert.equal(context.lock.firstCall.args[0], 'zoho_crm_fields_Contacts');

            // Verify cache was checked
            assert.equal(context.staticCache.get.callCount, 1);
            assert.equal(context.staticCache.get.firstCall.args[0], 'zoho_crm_fields_Contacts');

            // Verify cache was set
            assert.equal(context.staticCache.set.callCount, 1);
            assert.equal(context.staticCache.set.firstCall.args[0], 'zoho_crm_fields_Contacts');
            assert.deepEqual(context.staticCache.set.firstCall.args[1], fixtureFieldsData);
            assert.equal(context.staticCache.set.firstCall.args[2], 600000); // Default TTL

            // Verify response was sent
            assert.equal(context.sendJson.callCount, 1);
            assert.deepEqual(context.sendJson.firstCall.args[0], fixtureFieldsData);
            assert.equal(context.sendJson.firstCall.args[1], 'fields');
        });

        it('should use cached fields on subsequent calls', async function() {
            // First call returns null, second call returns cached data
            context.staticCache.get.onFirstCall().resolves(null)
                .onSecondCall().resolves(fixtureFieldsData);

            // First call
            await action.receive(context);

            // Second call
            await action.receive(context);

            // Verify lock was acquired twice
            assert.equal(context.lock.callCount, 2);

            // Verify cache was checked twice
            assert.equal(context.staticCache.get.callCount, 2);

            // Verify cache was only set once (first call)
            assert.equal(context.staticCache.set.callCount, 1);

            // Verify ZohoClient.getFields was only called once
            const ZohoClient = require('../../../../src/appmixer/zoho/ZohoClient');
            assert.equal(ZohoClient.prototype.getFields.callCount, 1);
        });

        it('should filter fields by filterApiName when provided', async function() {
            context.messages.in.content.filterApiName = 'field2';
            context.staticCache.get.onFirstCall().resolves(null);

            await action.receive(context);

            // Verify only the filtered field was sent
            assert.equal(context.sendJson.callCount, 1);
            assert.deepEqual(context.sendJson.firstCall.args[0], [
                { api_name: 'field2', field_label: 'Field 2' }
            ]);
            assert.equal(context.sendJson.firstCall.args[1], 'fields');
        });

        it('should filter cached fields by filterApiName', async function() {
            context.messages.in.content.filterApiName = 'field1';
            context.staticCache.get.onFirstCall().resolves(fixtureFieldsData);

            await action.receive(context);

            // Verify ZohoClient.getFields was not called (using cache)
            const ZohoClient = require('../../../../src/appmixer/zoho/ZohoClient');
            assert.equal(ZohoClient.prototype.getFields.callCount, 0);

            // Verify only the filtered field was sent
            assert.equal(context.sendJson.callCount, 1);
            assert.deepEqual(context.sendJson.firstCall.args[0], [
                { api_name: 'field1', field_label: 'Field 1' }
            ]);
        });

        it('should use custom TTL from config', async function() {
            context.config = { listFieldsCacheTTL: 300000 };
            context.staticCache.get.onFirstCall().resolves(null);

            await action.receive(context);

            // Verify cache was set with custom TTL
            assert.equal(context.staticCache.set.callCount, 1);
            assert.equal(context.staticCache.set.firstCall.args[2], 300000);
        });

        it('should unlock even if an error occurs', async function() {
            context.staticCache.get.onFirstCall().resolves(null);

            // Create a fresh mock lock for this test
            const mockLock = { unlock: sinon.stub() };
            context.lock.returns(mockLock);

            // Mock ZohoClient.getFields to throw an error
            const ZohoClient = require('../../../../src/appmixer/zoho/ZohoClient');
            ZohoClient.prototype.getFields.restore();
            sinon.stub(ZohoClient.prototype, 'getFields').rejects(new Error('API Error'));

            try {
                await action.receive(context);
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.equal(error.message, 'API Error');
            }

            // Verify lock was acquired
            assert.equal(context.lock.callCount, 1);

            // Verify unlock was called
            assert.equal(mockLock.unlock.callCount, 1);
        });

        it('should handle cache expiration correctly', async function() {
            const clock = sinon.useFakeTimers();

            try {
                // First call returns null, subsequent calls return cached value
                context.staticCache.get.onFirstCall().resolves(null)
                    .onSecondCall().resolves(fixtureFieldsData)
                    .onThirdCall().resolves(fixtureFieldsData)
                    .returns(null); // After cache expires

                // First call - populates cache
                await action.receive(context);
                assert.equal(context.staticCache.set.callCount, 1);

                // Second call - uses cache
                await action.receive(context);
                assert.equal(context.staticCache.set.callCount, 1);

                // Third call - uses cache
                await action.receive(context);
                assert.equal(context.staticCache.set.callCount, 1);

                // Advance time beyond TTL (600000ms = 10 minutes)
                await clock.tickAsync(600001);

                // Fourth call - cache expired, fetches again
                await action.receive(context);
                assert.equal(context.staticCache.set.callCount, 2);

                // Verify ZohoClient.getFields was called twice
                const ZohoClient = require('../../../../src/appmixer/zoho/ZohoClient');
                assert.equal(ZohoClient.prototype.getFields.callCount, 2);
            } finally {
                clock.restore();
            }
        });

        it('should use module-specific cache keys for different modules', async function() {
            context.staticCache.get.resolves(null);

            // Call for Contacts
            context.messages.in.content.moduleName = 'Contacts';
            await action.receive(context);

            // Call for Leads
            context.messages.in.content.moduleName = 'Leads';
            await action.receive(context);

            // Verify different cache keys were used
            assert.equal(context.staticCache.get.callCount, 2);
            assert.equal(context.staticCache.get.firstCall.args[0], 'zoho_crm_fields_Contacts');
            assert.equal(context.staticCache.get.secondCall.args[0], 'zoho_crm_fields_Leads');

            // Verify different locks were acquired
            assert.equal(context.lock.callCount, 2);
            assert.equal(context.lock.firstCall.args[0], 'zoho_crm_fields_Contacts');
            assert.equal(context.lock.secondCall.args[0], 'zoho_crm_fields_Leads');
        });
    });
});
