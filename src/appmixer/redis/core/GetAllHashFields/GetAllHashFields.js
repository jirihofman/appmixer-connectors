
'use strict';

const lib = require('../../lib');
module.exports = {
    async receive(context) {

        const { key } = context.messages.in.content;

        // https://redis.io/docs/latest/commands/hgetall/
        const { data } = await context.httpRequest({
            method: 'N/A',
            url: 'redis://<host>:<port>/redis://<host>:<port>',
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            }
        });

        return context.sendJson(data, 'out');
    }
};
