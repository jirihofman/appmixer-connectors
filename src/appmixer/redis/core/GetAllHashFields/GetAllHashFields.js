'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        const client = await lib.getClient(context);
        const fields = await client.hgetall(key);
        const fieldCount = Object.keys(fields).length;

        return context.sendJson({
            fields,
            fieldCount,
            key,
            exists: fieldCount > 0
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
