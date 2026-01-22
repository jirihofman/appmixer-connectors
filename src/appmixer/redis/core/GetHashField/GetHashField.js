'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key, field } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        if (!field) {
            throw new context.CancelError('Field is required!');
        }

        const client = await lib.getClient(context);
        const value = await client.hget(key, field);

        return context.sendJson({
            value,
            exists: value !== null,
            key,
            field
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
