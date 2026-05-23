'use strict';

const lib = require('../../lib');

const schema = {
    id: { type: 'string', title: 'Workspace ID', example: '64a687e29ae1f428e7ebe303' },
    name: { type: 'string', title: 'Name', example: 'Acme Workspace' },
    hourlyRate: { type: 'object', title: 'Hourly Rate', example: { amount: 10500, currency: 'USD' } },
    costRate: { type: 'object', title: 'Cost Rate', example: { amount: 7500, currency: 'USD' } },
    memberships: { type: 'array', title: 'Memberships', example: [] },
    workspaceSettings: { type: 'object', title: 'Workspace Settings', example: {} }
};

module.exports = {

    async receive(context) {
        const { outputType = 'array' } = context.messages.in.content;

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Workspaces' });
        }

        const workspaces = await lib.request(context, {
            method: 'GET',
            url: '/workspaces'
        });

        return lib.sendArrayOutput({
            context,
            outputType,
            records: Array.isArray(workspaces) ? workspaces : []
        });
    }
};
