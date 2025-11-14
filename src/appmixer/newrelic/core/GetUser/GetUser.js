'use strict';

module.exports = {

    async receive(context) {

        const { userId } = context.messages.in.content;

        if (!userId) {
            throw new context.CancelError('User ID is required!');
        }

        const lib = require('../../lib');
        const host = lib.getApiHost(context);
        const { data } = await context.httpRequest({
            method: 'GET',
            url: `${host}/v2/users/${userId}.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        return context.sendJson(data.user, 'out');
    }
};
