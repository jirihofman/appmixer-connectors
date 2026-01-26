'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key, count } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        const client = await lib.getClient(context);
        const safeCount = Number.isInteger(count) ? Math.max(count, 1) : undefined;
        const element = safeCount ? await client.lpop(key, safeCount) : await client.lpop(key);
        const exists = Array.isArray(element) ? element.length > 0 : element !== null;

        return context.sendJson({
            element,
            key,
            exists
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
