'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'string', 'title': 'Incident ID' },
    'type': { 'type': 'string', 'title': 'Type' },
    'name': { 'type': 'string', 'title': 'Name' },
    'cause': { 'type': 'string', 'title': 'Cause' },
    'started_at': { 'type': 'string', 'title': 'Started At' },
    'resolved_at': { 'type': 'string', 'title': 'Resolved At' },
    'acknowledged_at': { 'type': 'string', 'title': 'Acknowledged At' }
};

module.exports = {
    async receive(context) {
        const { outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Incidents', value: 'incidents' });
        }

        const response = await context.httpRequest({
            method: 'GET',
            url: 'https://uptime.betterstack.com/api/v2/incidents',
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            },
            params: {
                per_page: 100
            }
        });

        const incidents = response.data.data.map(item => ({
            id: item.id,
            type: item.type,
            ...item.attributes
        }));

        return lib.sendArrayOutput({ context, records: incidents, outputType });
    }
};
