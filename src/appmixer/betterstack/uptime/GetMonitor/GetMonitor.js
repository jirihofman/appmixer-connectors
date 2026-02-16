'use strict';

module.exports = {
    async receive(context) {
        const { monitorId } = context.messages.in.content;

        if (!monitorId) {
            throw new context.CancelError('Monitor ID is required!');
        }

        const response = await context.httpRequest({
            method: 'GET',
            url: `https://uptime.betterstack.com/api/v2/monitors/${monitorId}`,
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            }
        });

        const monitor = response.data.data.attributes;
        return context.sendJson({
            id: response.data.data.id,
            type: response.data.data.type,
            ...monitor
        }, 'out');
    }
};
