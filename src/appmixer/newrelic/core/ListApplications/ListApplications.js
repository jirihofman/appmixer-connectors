'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'integer', 'title': 'Application ID' },
    'name': { 'type': 'string', 'title': 'Name' },
    'language': { 'type': 'string', 'title': 'Language' },
    'health_status': { 'type': 'string', 'title': 'Health Status' },
    'reporting': { 'type': 'boolean', 'title': 'Reporting' },
    'last_reported_at': { 'type': 'string', 'title': 'Last Reported At' }
};

module.exports = {

    async receive(context) {

        const { outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Applications', value: 'applications' });
        }

        const host = lib.getApiHost(context);
        const { data } = await context.httpRequest({
            method: 'GET',
            url: `${host}/v2/applications.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        const applications = data.applications || [];

        return lib.sendArrayOutput({ context, records: applications, outputType });
    }
};
