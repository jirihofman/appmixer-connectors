'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'string', 'title': 'Heartbeat ID' },
    'type': { 'type': 'string', 'title': 'Type' },
    'pinged_at': { 'type': 'string', 'title': 'Pinged At' },
    'status': { 'type': 'string', 'title': 'Status' }
};

module.exports = {
    async receive(context) {
        const { monitorId, outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Heartbeats', value: 'heartbeats' });
        }

        if (!monitorId) {
            throw new context.CancelError('Monitor ID is required!');
        }

        const response = await context.httpRequest({
            method: 'GET',
            url: 'https://uptime.betterstack.com/api/v2/heartbeats',
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            },
            params: {
                monitor_id: monitorId,
                per_page: 100
            }
        });

        const heartbeats = response.data.data.map(item => ({
            id: item.id,
            type: item.type,
            ...item.attributes
        }));

        return lib.sendArrayOutput({ context, records: heartbeats, outputType });
    }
};
