'use strict';

module.exports = {

    async receive(context) {

        const { userId } = context.messages.in.content;

        if (!userId) {
            throw new context.CancelError('User ID is required!');
        }

        const { data } = await context.httpRequest({
            method: 'GET',
            url: `https://api.newrelic.com/v2/users/${userId}.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        return context.sendJson(data.user, 'out');
    }
};
