'use strict';

const lib = require('../../lib');

const schema = {
    'id': { 'type': 'integer', 'title': 'User ID' },
    'first_name': { 'type': 'string', 'title': 'First Name' },
    'last_name': { 'type': 'string', 'title': 'Last Name' },
    'email': { 'type': 'string', 'title': 'Email' },
    'role': { 'type': 'string', 'title': 'Role' }
};

module.exports = {

    async receive(context) {

        const { outputType } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Users', value: 'users' });
        }

        const { data } = await context.httpRequest({
            method: 'GET',
            url: 'https://api.newrelic.com/v2/users.json',
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        const users = data.users || [];

        return lib.sendArrayOutput({ context, records: users, outputType });
    }
};
