'use strict';

module.exports = {
    async receive(context) {
        const { monitorId } = context.messages.in.content;

        if (!monitorId) {
            throw new context.CancelError('Monitor ID is required!');
        }

        const response = await context.httpRequest({
            method: 'POST',
            url: `https://uptime.betterstack.com/api/v2/heartbeats/${monitorId}`,
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            }
        });

        return context.sendJson({
            status: 'success',
            message: 'Heartbeat sent successfully'
        }, 'out');
    }
};
