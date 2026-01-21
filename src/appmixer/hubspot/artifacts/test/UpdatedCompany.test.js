'use strict';

const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../../../../../test/utils.js');
const UpdatedCompany = require('../../crm/UpdatedCompany/UpdatedCompany.js');
const { WATCHED_PROPERTIES_COMPANY } = require('../../commons.js');

describe('UpdatedCompany', () => {

    let context = testUtils.createMockContext();
    let hubspotStub;

    beforeEach(async () => {

        // Reset the context.
        context = testUtils.createMockContext();
        // Set the profile info.
        context.auth.profileInfo = {
            token: 'CJSP5qf1KhICAQEYs-gDIIGOBii1hQIyGQAf3xBKmlwHjX7OIpuIFEavB2-qYAGQsF4',
            user: 'test@hubspot.com',
            hub_domain: 'demo.hubapi.com',
            scopes: [
                'contacts',
                'automation',
                'oauth'
            ],
            hub_id: 33,
            app_id: 456,
            expires_in: 21588,
            user_id: 123,
            token_type: 'access'
        };
        context.messages = { webhook: { content: { data: null } } };
        // Set the properties to output. If not empty, the component will only output these properties
        // and will not call HubSpot API to get all properties.
        context.properties = { properties: 'name,domain,industry,phone' };
        context.componentId = 'testComponentId';

        // Reset hubspot stub if it was called before
        if (hubspotStub) {
            hubspotStub.restore();
        }
        hubspotStub = sinon.stub(UpdatedCompany.hubspot, 'call');
    });

    it('created and updated at the same time', async () => {

        context.messages.webhook.content.data = {
            '38533722672': {
                occurredAt: 1726820305517,
                propertyName: 'name',
                propertyValue: 'New Company'
            }
        };

        // Mock the response of the hubspot call
        hubspotStub.withArgs('post', 'crm/v3/objects/companies/batch/read').resolves({
            data: {
                results: [
                    {
                        id: '38533722672',
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z',
                        name: 'New Company'
                    }
                ]
            }
        });

        await UpdatedCompany.receive(context);

        assert.equal(hubspotStub.callCount, 1);
        assert.equal(hubspotStub.args[0][0], 'post');
        assert.equal(hubspotStub.args[0][1], 'crm/v3/objects/companies/batch/read');

        assert.equal(context.sendArray.callCount, 1);
        assert.equal(context.sendArray.args[0][0].length, 0, 'No changes sent');
        assert.equal(context.response.callCount, 1);
    });

    it('update of ignored property only', async () => {

        context.messages.webhook.content.data = {
            '38533722673': {
                occurredAt: 1726820305517,
                propertyName: 'lastmodifieddate',
                propertyValue: '2023-01-01T00:00:00Z'
            }
        };

        // Mock the response of the hubspot call
        hubspotStub.withArgs('post', 'crm/v3/objects/companies/batch/read').resolves({
            data: {
                results: []
            }
        });

        await UpdatedCompany.receive(context);

        assert.equal(hubspotStub.callCount, 0, 'No call to hubspot');
        assert.equal(context.sendArray.callCount, 0);
        assert.equal(context.response.callCount, 1);
    });

    // HubSpot can trigger multiple updates of the same company in a short period of time.
    // 1. The first update changes name
    // 2. The second update changes domain
    it('multiple updates of same company', async () => {

        context.messages.webhook.content.data = {
            '38533722672': {
                occurredAt: 1726820305517,
                propertyName: 'name',
                propertyValue: 'Example Company'
            }
        };

        // Mock the response of the hubspot call
        hubspotStub.withArgs('post', 'crm/v3/objects/companies/batch/read').resolves({
            data: {
                results: [
                    {
                        id: '38533722672',
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z',
                        name: 'Example Company',
                        domain: 'example.com'
                    }
                ]
            }
        });

        // No data in cache
        context.staticCache.get = sinon.stub().returns(null);

        await UpdatedCompany.receive(context);

        // Company ID is cached
        assert.equal(context.staticCache.set.callCount, 1);

        context.messages.webhook.content.data = {
            '38533722672': {
                occurredAt: 1726820305517,
                propertyName: 'domain',
                propertyValue: 'example.com'
            }
        };

        // HubSpot sends the second event few milliseconds after the first one
        // This simulates creating the lock and cache in the first `receive` call
        context.staticCache.get = sinon.stub().returns('1726820305517');
        await UpdatedCompany.receive(context);

        assert.equal(hubspotStub.callCount, 1);
        assert.equal(hubspotStub.args[0][0], 'post');
        assert.equal(hubspotStub.args[0][1], 'crm/v3/objects/companies/batch/read');

        assert.equal(context.sendArray.callCount, 1, 'Only one message sent');
        assert.equal(context.sendArray.args[0][0].length, 0, 'No changes sent');
        assert.equal(context.response.callCount, 2);
    });

    it('getSubscriptions', async () => {

        // Common for both versions
        const subscriptions = UpdatedCompany.getSubscriptions();
        assert.equal(subscriptions.length, WATCHED_PROPERTIES_COMPANY.length);
    });

    it('should cache outPort schema', async function() {

        // No `properties` in the context so we need to call HubSpot API to get all properties.
        context.properties = {};
        // We receive 10 webhook payloads, one updated company in each payload.
        // We should cache the outPort schema after the first payload.
        const payloads = Array.from({ length: 10 }, (_, i) => {
            return {
                [`${i}`]: {
                    occurredAt: 1726820305517 + i,
                    propertyName: 'name',
                    propertyValue: 'Company-' + i
                }
            };
        });

        // Mock the response of the hubspot call for company properties
        hubspotStub.withArgs('get', 'crm/v3/properties/companies').resolves({
            data: {
                results: [
                    {
                        name: 'name',
                        label: 'Name',
                        type: 'string',
                        fieldType: 'text',
                        readOnlyDefinition: false,
                        hidden: false,
                        options: []
                    }
                ]
            }
        });
        // Mock the response of the hubspot call
        for (const payload of payloads) {
            hubspotStub.withArgs('post', 'crm/v3/objects/companies/batch/read').resolves({
                data: {
                    results: [{
                        id: Object.keys(payload)[0],
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z',
                        name: 'Company-' + Object.keys(payload)[0]
                    }]
                }
            });
        }

        for (const payload of payloads) {
            context.messages.webhook.content.data = payload;
            await UpdatedCompany.receive(context);
        }

        assert.equal(hubspotStub.callCount, 11, 'Should make 10 calls to get company data and 1 call to get company properties');
    });
});
