'use strict';

module.exports = {

    async receive(context) {

        const { serverId } = context.messages.in.content;

        if (!serverId) {
            throw new context.CancelError('Server ID is required!');
        }

        const { data } = await context.httpRequest({
            method: 'GET',
            url: `https://api.newrelic.com/v2/servers/${serverId}.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        return context.sendJson(data.server, 'out');
    }
};
