'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'integer', 'title': 'Host ID' },
    'application_name': { 'type': 'string', 'title': 'Application Name' },
    'host': { 'type': 'string', 'title': 'Host' },
    'health_status': { 'type': 'string', 'title': 'Health Status' },
    'language': { 'type': 'string', 'title': 'Language' },
    'application_summary': { 'type': 'object', 'title': 'Application Summary' }
};

module.exports = {

    async receive(context) {

        const { applicationId, outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Hosts', value: 'hosts' });
        }

        if (!applicationId) {
            throw new context.CancelError('Application ID is required!');
        }

        const { data } = await context.httpRequest({
            method: 'GET',
            url: `https://api.newrelic.com/v2/applications/${applicationId}/hosts.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        const hosts = data.application_hosts || [];

        return lib.sendArrayOutput({ context, records: hosts, outputType });
    }
};
