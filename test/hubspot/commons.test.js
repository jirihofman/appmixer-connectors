const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');
let HubSpot = require('../../src/appmixer/hubspot/Hubspot.js');

describe('commons.js', () => {

    let context = testUtils.createMockContext();
    let hubspotStub;

    beforeEach(async () => {

        // Reset the context.
        context = testUtils.createMockContext();
        context.auth = { profileInfo: { hub_id: '123456' } };
        context.messages = { in: { content: {} } };
        context.config = {
            objectPropertiesCacheTTL: 1
        };
        // Reset hubspot stub if it was called before
        if (hubspotStub) {
            hubspotStub.restore();
        }
        // Stub the hubspot methods
        hubspotStub = sinon.stub(HubSpot.prototype, 'call');
    });

    it('should mark custom properties with a suffix', async () => {

        const { getObjectProperties } = require('../../src/appmixer/hubspot/commons');
        // Mock the response of the hubspot call for contact properties
        const mockedResponse = [
            {
                name: 'jirka_notes',
                label: 'Jirka Notes',
                type: 'string',
                fieldType: 'text',
                description: 'What does Jirka think of this contact?',
                createdUserId: '71561347',
                displayOrder: -1,
                hidden: false,
                formField: true
            },
            {
                name: 'jobtitle',
                label: 'Job Title',
                type: 'string',
                fieldType: 'text',
                description: "A contact's job title",
                displayOrder: 12,
                hidden: false,
                formField: true
            }
        ];
        hubspotStub.withArgs('get', 'crm/v3/properties/contacts').resolves({ data: { results: mockedResponse } });

        const properties = await getObjectProperties(context, { call: hubspotStub }, 'contacts');
        assert(properties.length > 0);
        assert.equal(properties[0].label, 'Jirka Notes [custom]', 'Custom field should have [custom] suffix');
        assert.equal(properties[1].label, 'Job Title', 'Non custom field should not have [custom] suffix');

        // Should use `hub_id` from context to differentiate between different HubSpot portals/users.
        const setCacheArgs = context.staticCache.set.getCall(0).args;
        assert.equal(setCacheArgs[0], 'hubspot_properties_contacts_123456_all', 'Cache key should contain hub_id');
    });

    it('should use cache and avoid lock when data is already cached', async () => {

        const { getObjectProperties } = require('../../src/appmixer/hubspot/commons');

        const cachedData = [
            {
                name: 'email',
                label: 'Email',
                type: 'string'
            }
        ];

        // Pre-populate cache
        context.staticCache.set('hubspot_properties_contacts_123456_all', cachedData);

        const properties = await getObjectProperties(context, { call: hubspotStub }, 'contacts');

        assert.equal(properties, cachedData, 'Should return cached data');
        assert.equal(hubspotStub.callCount, 0, 'Should not call HubSpot API when cached');
        assert.equal(context.lock.callCount, 0, 'Should not acquire lock when cached');
    });

    it('should use correct lock key with portalId to prevent race conditions', async () => {

        const { getObjectProperties } = require('../../src/appmixer/hubspot/commons');

        const mockedResponse = [
            {
                name: 'email',
                label: 'Email',
                type: 'string',
                fieldType: 'text'
            }
        ];
        hubspotStub.withArgs('get', 'crm/v3/properties/contacts').resolves({ data: { results: mockedResponse } });

        await getObjectProperties(context, { call: hubspotStub }, 'contacts');

        const lockKey = context.lock.getCall(0).args[0];
        assert.equal(lockKey, 'hubspot_properties_contacts_123456', 'Lock key should include portalId');
    });

    it('should handle concurrent requests from different portals independently', async () => {

        const { getObjectProperties } = require('../../src/appmixer/hubspot/commons');

        // Context for portal 1
        const context1 = testUtils.createMockContext();
        context1.auth = { profileInfo: { hub_id: '111111' } };
        context1.config = { objectPropertiesCacheTTL: 60000 };

        // Context for portal 2
        const context2 = testUtils.createMockContext();
        context2.auth = { profileInfo: { hub_id: '222222' } };
        context2.config = { objectPropertiesCacheTTL: 60000 };

        const mockedResponse1 = [{ name: 'email1', label: 'Email 1' }];
        const mockedResponse2 = [{ name: 'email2', label: 'Email 2' }];

        const hubspotStub1 = sinon.stub().resolves({ data: { results: mockedResponse1 } });
        const hubspotStub2 = sinon.stub().resolves({ data: { results: mockedResponse2 } });

        // Execute concurrently
        const [properties1, properties2] = await Promise.all([
            getObjectProperties(context1, { call: hubspotStub1 }, 'contacts'),
            getObjectProperties(context2, { call: hubspotStub2 }, 'contacts')
        ]);

        // Each portal should have its own data
        assert.equal(properties1[0].name, 'email1', 'Portal 1 should have its own data');
        assert.equal(properties2[0].name, 'email2', 'Portal 2 should have its own data');

        // Verify locks were acquired with different keys
        const lock1Key = context1.lock.getCall(0).args[0];
        const lock2Key = context2.lock.getCall(0).args[0];
        assert.equal(lock1Key, 'hubspot_properties_contacts_111111', 'Portal 1 lock key should include its portalId');
        assert.equal(lock2Key, 'hubspot_properties_contacts_222222', 'Portal 2 lock key should include its portalId');
        assert.notEqual(lock1Key, lock2Key, 'Lock keys should be different for different portals');
    });

    it('should double-check cache after acquiring lock', async () => {

        const { getObjectProperties } = require('../../src/appmixer/hubspot/commons');

        const cachedData = [{ name: 'email', label: 'Email' }];
        const mockedResponse = [{ name: 'other', label: 'Other' }];

        hubspotStub.withArgs('get', 'crm/v3/properties/contacts').resolves({ data: { results: mockedResponse } });

        // Simulate cache being populated between initial check and lock acquisition
        context.staticCache.get.onFirstCall().returns(null); // Initial check: no cache
        context.staticCache.get.onSecondCall().returns(cachedData); // After lock: cache populated

        const properties = await getObjectProperties(context, { call: hubspotStub }, 'contacts');

        assert.equal(properties, cachedData, 'Should return cached data from double-check');
        assert.equal(hubspotStub.callCount, 0, 'Should not call HubSpot API when cache populated by concurrent request');
    });
});
