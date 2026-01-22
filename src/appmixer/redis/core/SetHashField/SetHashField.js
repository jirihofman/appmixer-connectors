'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key, field, value } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        if (!field) {
            throw new context.CancelError('Field is required!');
        }

        if (value === undefined || value === null) {
            throw new context.CancelError('Value is required!');
        }

        const client = await lib.getClient(context);
        const created = await client.hset(key, field, value);

        return context.sendJson({
            created,
            key,
            field,
            value
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
