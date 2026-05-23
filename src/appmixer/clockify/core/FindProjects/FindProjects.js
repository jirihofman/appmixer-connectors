'use strict';

const lib = require('../../lib');

const schema = {
    id: { type: 'string', title: 'Project ID', example: '25b687e29ae1f428e7ebe123' },
    name: { type: 'string', title: 'Name', example: 'Website Redesign' },
    clientId: { type: 'string', title: 'Client ID', example: '98h687e29ae1f428e7ebe707' },
    workspaceId: { type: 'string', title: 'Workspace ID', example: '64a687e29ae1f428e7ebe303' },
    billable: { type: 'boolean', title: 'Billable', example: true },
    archived: { type: 'boolean', title: 'Archived', example: false },
    color: { type: 'string', title: 'Color', example: '#03A9F4' },
    duration: { type: 'string', title: 'Duration', example: 'PT1H30M' }
};

module.exports = {

    async receive(context) {
        const {
            workspaceId,
            name,
            clientId,
            archived,
            billable,
            access,
            strictNameSearch,
            outputType = 'array'
        } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Projects' });
        }

        const projects = await lib.requestPaginated(context, {
            url: `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
            params: lib.compact({
                name,
                archived,
                billable,
                access,
                'strict-name-search': strictNameSearch,
                clients: clientId ? [clientId] : undefined
            })
        });

        if (projects.length === 0) {
            return context.sendJson({}, 'notFound');
        }

        return lib.sendArrayOutput({ context, outputType, records: projects });
    }
};
