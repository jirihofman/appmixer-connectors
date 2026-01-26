'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        const keys = key.split(',').map(item => item.trim()).filter(Boolean);
        if (keys.length === 0) {
            throw new context.CancelError('Key is required!');
        }

        const client = await lib.getClient(context);
        const count = await client.exists(keys);

        return context.sendJson({
            count,
            exists: count > 0,
            key: keys.join(',')
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
