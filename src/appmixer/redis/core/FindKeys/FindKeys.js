'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { pattern } = context.messages.in.content;

        if (!pattern) {
            throw new context.CancelError('Pattern is required!');
        }

        const client = await lib.getClient(context);
        const keys = await client.keys(pattern);

        return context.sendJson({
            keys,
            count: keys.length,
            pattern
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
