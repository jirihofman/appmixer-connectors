'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key, seconds, condition } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        if (!Number.isInteger(seconds)) {
            throw new context.CancelError('Seconds is required!');
        }

        const client = await lib.getClient(context);
        const args = [key, Math.max(seconds, 0)];

        if (condition) {
            args.push(condition);
        }

        const result = await client.expire(...args);

        return context.sendJson({
            success: result === 1,
            key,
            seconds
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
