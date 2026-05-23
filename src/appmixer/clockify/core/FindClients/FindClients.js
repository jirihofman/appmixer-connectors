'use strict';

const lib = require('../../lib');

const schema = {
    id: { type: 'string', title: 'Client ID', example: '98h687e29ae1f428e7ebe707' },
    name: { type: 'string', title: 'Name', example: 'Acme Corporation' },
    archived: { type: 'boolean', title: 'Archived', example: false },
    workspaceId: { type: 'string', title: 'Workspace ID', example: '64a687e29ae1f428e7ebe303' },
    address: { type: 'string', title: 'Address', example: '123 Main Street' },
    note: { type: 'string', title: 'Note', example: 'Primary client' }
};

module.exports = {

    async receive(context) {
        const {
            workspaceId,
            name,
            archived,
            strictNameSearch,
            outputType = 'array'
        } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Clients' });
        }

        const clients = await lib.requestPaginated(context, {
            url: `/workspaces/${encodeURIComponent(workspaceId)}/clients`,
            params: lib.compact({
                name,
                archived,
                'strict-name-search': strictNameSearch
            })
        });

        if (clients.length === 0) {
            return context.sendJson({}, 'notFound');
        }

        return lib.sendArrayOutput({ context, outputType, records: clients });
    }
};
