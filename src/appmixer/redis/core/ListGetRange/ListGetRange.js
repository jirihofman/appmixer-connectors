'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key, start, stop } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        if (!Number.isInteger(start)) {
            throw new context.CancelError('Start is required!');
        }

        if (!Number.isInteger(stop)) {
            throw new context.CancelError('Stop is required!');
        }

        const client = await lib.getClient(context);
        const elements = await client.lrange(key, start, stop);

        return context.sendJson({
            elements,
            count: elements.length,
            key,
            start,
            stop
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
