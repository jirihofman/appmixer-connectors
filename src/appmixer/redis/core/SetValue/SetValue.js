'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const {
            key,
            value,
            expirationSeconds,
            expirationMilliseconds,
            condition
        } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        if (value === undefined || value === null) {
            throw new context.CancelError('Value is required!');
        }

        const client = await lib.getClient(context);
        const args = [key, value];

        if (Number.isInteger(expirationSeconds)) {
            args.push('EX', Math.max(expirationSeconds, 0));
        }

        if (Number.isInteger(expirationMilliseconds)) {
            args.push('PX', Math.max(expirationMilliseconds, 0));
        }

        if (condition) {
            args.push(condition);
        }

        const result = await client.set(...args);

        return context.sendJson({
            success: result === 'OK',
            key,
            value
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
