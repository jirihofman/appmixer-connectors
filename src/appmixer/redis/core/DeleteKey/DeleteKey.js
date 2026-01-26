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
        const deletedCount = await client.del(keys);

        return context.sendJson({
            deletedCount,
            keys: keys.join(',')
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
