'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'string', 'title': 'Monitor ID' },
    'type': { 'type': 'string', 'title': 'Type' },
    'url': { 'type': 'string', 'title': 'URL' },
    'pronounceable_name': { 'type': 'string', 'title': 'Monitor Name' },
    'status': { 'type': 'string', 'title': 'Status' },
    'check_frequency': { 'type': 'integer', 'title': 'Check Frequency' },
    'created_at': { 'type': 'string', 'title': 'Created At' },
    'updated_at': { 'type': 'string', 'title': 'Updated At' }
};

module.exports = {
    async receive(context) {
        const { outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Monitors', value: 'monitors' });
        }

        const response = await context.httpRequest({
            method: 'GET',
            url: 'https://uptime.betterstack.com/api/v2/monitors',
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            },
            params: {
                per_page: 100
            }
        });

        const monitors = response.data.data.map(item => ({
            id: item.id,
            type: item.type,
            ...item.attributes
        }));

        return lib.sendArrayOutput({ context, records: monitors, outputType });
    }
};
