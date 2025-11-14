'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'integer', 'title': 'Server ID' },
    'name': { 'type': 'string', 'title': 'Name' },
    'host': { 'type': 'string', 'title': 'Host' },
    'health_status': { 'type': 'string', 'title': 'Health Status' },
    'reporting': { 'type': 'boolean', 'title': 'Reporting' },
    'last_reported_at': { 'type': 'string', 'title': 'Last Reported At' }
};

module.exports = {

    async receive(context) {

        const { outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Servers', value: 'servers' });
        }

        const { data } = await context.httpRequest({
            method: 'GET',
            url: 'https://api.newrelic.com/v2/servers.json',
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        const servers = data.servers || [];

        return lib.sendArrayOutput({ context, records: servers, outputType });
    }
};
