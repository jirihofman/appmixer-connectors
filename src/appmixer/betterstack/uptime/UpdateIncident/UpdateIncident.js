'use strict';

module.exports = {
    async receive(context) {
        const { incidentId, requester_email } = context.messages.in.content;

        if (!incidentId) {
            throw new context.CancelError('Incident ID is required!');
        }

        const body = {};
        if (requester_email) body.requester_email = requester_email;

        await context.httpRequest({
            method: 'PATCH',
            url: `https://uptime.betterstack.com/api/v2/incidents/${incidentId}`,
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`,
                'Content-Type': 'application/json'
            },
            data: body
        });

        return context.sendJson({}, 'out');
    }
};
