'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        const client = await lib.getClient(context);
        const value = await client.get(key);

        return context.sendJson({
            value,
            exists: value !== null,
            key
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
