'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {
        const {
            workspaceId,
            name,
            clientId,
            billable,
            isPublic,
            color
        } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (!name) {
            throw new context.CancelError('Name is required!');
        }

        const project = await lib.request(context, {
            method: 'POST',
            url: `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
            data: lib.compact({
                name,
                clientId,
                billable,
                isPublic,
                color
            })
        });

        return context.sendJson(project, 'out');
    }
};
