'use strict';

const lib = require('../../lib');

const schema = {
    id: { type: 'string', title: 'Time Entry ID', example: '64c777ddd3fcab07cfbb210c' },
    description: { type: 'string', title: 'Description', example: 'This is a sample time entry description.' },
    userId: { type: 'string', title: 'User ID', example: '5a0ab5acb07987125438b60f' },
    projectId: { type: 'string', title: 'Project ID', example: '25b687e29ae1f428e7ebe123' },
    taskId: { type: 'string', title: 'Task ID', example: '54m377ddd3fcab07cfbb432w' },
    workspaceId: { type: 'string', title: 'Workspace ID', example: '64a687e29ae1f428e7ebe303' },
    billable: { type: 'boolean', title: 'Billable', example: false },
    tagIds: { type: 'array', title: 'Tag IDs', example: ['321r77ddd3fcab07cfbb567y'] },
    timeInterval: { type: 'object', title: 'Time Interval', example: { start: '2020-01-01T00:00:00Z', end: '2021-01-01T00:00:00Z', duration: '8000' } },
    type: { type: 'string', title: 'Type', example: 'REGULAR' }
};

module.exports = {

    async receive(context) {
        const {
            workspaceId,
            userId,
            description,
            start,
            end,
            projectId,
            taskId,
            tagIds,
            outputType = 'array'
        } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (!userId) {
            throw new context.CancelError('User ID is required!');
        }

        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(context, outputType, schema, { label: 'Time Entries' });
        }

        const timeEntries = await lib.requestPaginated(context, {
            url: `/workspaces/${encodeURIComponent(workspaceId)}/user/${encodeURIComponent(userId)}/time-entries`,
            params: lib.compact({
                description,
                start,
                end,
                project: projectId,
                task: taskId,
                tags: lib.parseList(tagIds)
            })
        });

        if (timeEntries.length === 0) {
            return context.sendJson({}, 'notFound');
        }

        return lib.sendArrayOutput({ context, outputType, records: timeEntries });
    }
};
