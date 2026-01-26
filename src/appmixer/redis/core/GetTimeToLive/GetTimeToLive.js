'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        const client = await lib.getClient(context);
        const ttl = await client.ttl(key);

        return context.sendJson({
            ttl,
            key,
            hasExpiration: ttl > -1
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
