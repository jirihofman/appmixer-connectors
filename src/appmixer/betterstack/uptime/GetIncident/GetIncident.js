'use strict';

module.exports = {
    async receive(context) {
        const { incidentId } = context.messages.in.content;

        if (!incidentId) {
            throw new context.CancelError('Incident ID is required!');
        }

        const response = await context.httpRequest({
            method: 'GET',
            url: `https://uptime.betterstack.com/api/v2/incidents/${incidentId}`,
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            }
        });

        const incident = response.data.data.attributes;
        return context.sendJson({
            id: response.data.data.id,
            type: response.data.data.type,
            ...incident
        }, 'out');
    }
};
