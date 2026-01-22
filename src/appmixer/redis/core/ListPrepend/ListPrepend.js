'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const { key, element } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        if (!element) {
            throw new context.CancelError('Element is required!');
        }

        const elements = element.split(',').map(item => item.trim()).filter(Boolean);
        if (elements.length === 0) {
            throw new context.CancelError('Element is required!');
        }

        const client = await lib.getClient(context);
        const length = await client.lpush(key, elements);

        return context.sendJson({
            length,
            key,
            elements: elements.join(',')
        }, 'out');
    },

    async stop(context) {

        await lib.disconnect(context);
    }
};
