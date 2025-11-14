'use strict';

module.exports = {

    async receive(context) {

        const { name, incident_preference: incidentPreference } = context.messages.in.content;

        if (!name) {
            throw new context.CancelError('Policy Name is required!');
        }

        const lib = require('../../lib');
        const host = lib.getApiHost(context);
        const { data } = await context.httpRequest({
            method: 'POST',
            url: `${host}/v2/alerts_policies.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey,
                'Content-Type': 'application/json'
            },
            data: {
                policy: {
                    name,
                    incident_preference: incidentPreference || 'PER_POLICY'
                }
            }
        });

        return context.sendJson(data.policy, 'out');
    }
};
