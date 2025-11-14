'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'integer', 'title': 'Deployment ID' },
    'revision': { 'type': 'string', 'title': 'Revision' },
    'changelog': { 'type': 'string', 'title': 'Changelog' },
    'description': { 'type': 'string', 'title': 'Description' },
    'user': { 'type': 'string', 'title': 'User' },
    'timestamp': { 'type': 'string', 'title': 'Timestamp' }
};

module.exports = {

    async receive(context) {

        const { applicationId, outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Deployments', value: 'deployments' });
        }

        if (!applicationId) {
            throw new context.CancelError('Application ID is required!');
        }

        const host = lib.getApiHost(context);
        const { data } = await context.httpRequest({
            method: 'GET',
            url: `${host}/v2/applications/${applicationId}/deployments.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        const deployments = data.deployments || [];

        return lib.sendArrayOutput({ context, records: deployments, outputType });
    }
};
