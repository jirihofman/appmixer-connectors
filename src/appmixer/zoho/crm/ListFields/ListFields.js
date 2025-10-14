'use strict';
const ZohoClient = require('../../ZohoClient');

/**
 * Component for fetching list of fields.
 */
module.exports = {

    async receive(context) {

        const { moduleName, filterApiName } = context.messages.in.content;
        const cacheKey = `zoho_crm_fields_${moduleName}`;
        let lock;
        try {
            lock = await context.lock(cacheKey);

            let fields = await context.staticCache.get(cacheKey);
            if (!fields) {
                fields = await (new ZohoClient(context)).getFields(moduleName);
                await context.staticCache.set(cacheKey, fields, context?.config?.listFieldsCacheTTL || 600000);
            }
            if (filterApiName) {
                // eslint-disable-next-line camelcase
                fields = fields.filter(({ api_name }) => api_name === filterApiName);
            }
            return context.sendJson(fields, 'fields');
        } finally {
            lock?.unlock();
        }
    }
};
