'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {
        const {
            workspaceId,
            projectId,
            name,
            assigneeIds,
            billable,
            estimate,
            status
        } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (!projectId) {
            throw new context.CancelError('Project ID is required!');
        }

        if (!name) {
            throw new context.CancelError('Name is required!');
        }

        const task = await lib.request(context, {
            method: 'POST',
            url: `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks`,
            data: lib.compact({
                name,
                assigneeIds: lib.parseList(assigneeIds),
                billable,
                estimate,
                status
            })
        });

        return context.sendJson(task, 'out');
    }
};
