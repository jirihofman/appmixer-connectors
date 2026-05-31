'use strict';
const BaseSubscriptionComponent = require('../../BaseSubscriptionComponent');
const { WATCHED_PROPERTIES_COMPANY, getObjectProperties } = require('../../commons');

const subscriptionType = 'company.propertyChange';

class UpdatedCompany extends BaseSubscriptionComponent {

    getSubscriptions() {

        // Only watching for the properties that are present in the CreateCompany inspector.
        const subscriptions = WATCHED_PROPERTIES_COMPANY.map(propertyName => ({
            enabled: true,
            subscriptionDetails: {
                subscriptionType,
                propertyName
            }
        }));
        return subscriptions;
    }

    async receive(context) {

        this.configureHubspot(context);

        const eventsByObjectId = context.messages.webhook.content.data;

        let events = {};
        // Locking to avoid duplicates. HubSpot payloads can come within milliseconds of each other.
        let lock;

        try {
            lock = await context.lock(context.componentId, {
                ttl: 1000 * 10,
                retryDelay: 500,
                maxRetryCount: 3
            });

            for (const [companyId, event] of Object.entries(eventsByObjectId)) {
                const cacheKey = 'hubspot-company-updated-' + companyId;
                // Only track changes in these properties. These are the ones present in the CreateCompany inspector.
                // Even if we limit the subscriptions for these properties only, we need this for flows that
                // are already running and all the subscriptions.
                if (WATCHED_PROPERTIES_COMPANY.includes(event.propertyName)) {
                    const cached = await context.staticCache.get(cacheKey);
                    if (cached && event.occurredAt <= cached) {
                        continue;
                    }
                    // Cache the event for 5s to avoid duplicates
                    await context.staticCache.set(cacheKey, event.occurredAt, context.config?.eventCacheTTL || 5000);
                    events[companyId] = { occurredAt: event.occurredAt };
                }
            }
        } finally {
            await lock?.unlock();
        }

        // Get all objectIds
        const ids = Object.keys(events);
        if (!ids.length) {
            return context.response();
        }

        let propertiesToReturn;
        const { properties } = context.properties;
        if (!properties) {
            // Return all properties by default.
            propertiesToReturn = await getObjectProperties(context, this.hubspot, 'companies', 'names');
        } else {
            propertiesToReturn = properties.split(',');
        }

        // Call the API to get the companies in bulk
        const { data } = await this.hubspot.call('post', 'crm/v3/objects/companies/batch/read', {
            inputs: ids.map((id) => ({ id })),
            properties: propertiesToReturn
        });

        const results = [];
        data.results.forEach((company) => {
            if (company.updatedAt !== company.createdAt) {
                results.push(company);
            }
        });

        await context.sendArray(results, 'company');

        return context.response();
    }
}

module.exports = new UpdatedCompany(subscriptionType);
