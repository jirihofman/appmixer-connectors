'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'integer', 'title': 'Policy ID' },
    'name': { 'type': 'string', 'title': 'Name' },
    'incident_preference': { 'type': 'string', 'title': 'Incident Preference' },
    'created_at': { 'type': 'integer', 'title': 'Created At' },
    'updated_at': { 'type': 'integer', 'title': 'Updated At' }
};

module.exports = {

    async receive(context) {

        const { outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Policies', value: 'policies' });
        }

        const host = lib.getApiHost(context);
        const { data } = await context.httpRequest({
            method: 'GET',
            url: `${host}/v2/alerts_policies.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        const policies = data.policies || [];

        return lib.sendArrayOutput({ context, records: policies, outputType });
    }
};
