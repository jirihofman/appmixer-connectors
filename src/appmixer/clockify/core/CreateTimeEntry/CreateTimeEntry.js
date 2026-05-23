'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {
        const {
            workspaceId,
            start,
            end,
            projectId,
            taskId,
            tagIds,
            description,
            billable,
            type
        } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (!start) {
            throw new context.CancelError('Start is required!');
        }

        const timeEntry = await lib.request(context, {
            method: 'POST',
            url: `/workspaces/${encodeURIComponent(workspaceId)}/time-entries`,
            data: lib.compact({
                start,
                end,
                projectId,
                taskId,
                tagIds: lib.parseList(tagIds),
                description,
                billable,
                type
            })
        });

        return context.sendJson(timeEntry, 'out');
    }
};
