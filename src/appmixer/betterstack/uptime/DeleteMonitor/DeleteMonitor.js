'use strict';

module.exports = {
    async receive(context) {
        const { monitorId } = context.messages.in.content;

        if (!monitorId) {
            throw new context.CancelError('Monitor ID is required!');
        }

        await context.httpRequest({
            method: 'DELETE',
            url: `https://uptime.betterstack.com/api/v2/monitors/${monitorId}`,
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            }
        });

        return context.sendJson({}, 'out');
    }
};
