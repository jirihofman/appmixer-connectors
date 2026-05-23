'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {
        const { workspaceId, name } = context.messages.in.content;

        if (!workspaceId) {
            throw new context.CancelError('Workspace ID is required!');
        }

        if (!name) {
            throw new context.CancelError('Name is required!');
        }

        const client = await lib.request(context, {
            method: 'POST',
            url: `/workspaces/${encodeURIComponent(workspaceId)}/clients`,
            data: { name }
        });

        return context.sendJson(client, 'out');
    }
};
