'use strict';

const lib = require('../../lib');

const schema = {
    id: { type: 'string', title: 'Task ID', example: '57a687e29ae1f428e7ebe107' },
    name: { type: 'string', title: 'Name', example: 'Bugfixing' },
    projectId: { type: 'string', title: 'Project ID', example: '25b687e29ae1f428e7ebe123' },
    status: { type: 'string', title: 'Status', example: 'ACTIVE' },
    assigneeIds: { type: 'array', title: 'Assignee IDs', example: ['45b687e29ae1f428e7ebe123'] },
    billable: { type: 'boolean', title: 'Billable', example: true },
    estimate: { type: 'string', title: 'Estimate', example: 'PT1H30M' },
    duration: { type: 'string', title: 'Duration', example: 'PT1H30M' }
};

module.exports = {

    async receive(context) {
        const {
            workspaceId,
            projectId,
            name,
            status,
            outputType = 'array'
        } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (!projectId) {
            throw new context.CancelError('Project ID is required!');
        }

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Tasks' });
        }

        const tasks = await lib.requestPaginated(context, {
            url: `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks`,
            params: lib.compact({
                name,
                status
            })
        });

        if (tasks.length === 0) {
            return context.sendJson({}, 'notFound');
        }

        return lib.sendArrayOutput({ context, outputType, records: tasks });
    }
};
