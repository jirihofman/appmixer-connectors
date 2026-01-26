'use strict';

const { createRedisClient } = require('../../common');

module.exports = {
    async receive(context) {
        const { key } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }

        let client;
        try {
            client = createRedisClient(context.auth);

            // Get the value
            const value = await client.get(key);
            const exists = value !== null;

            return context.sendJson({ 
                key, 
                value: value || '', 
                exists 
            }, 'out');
        } finally {
            if (client) {
                await client.quit();
            }
        }
    }
};
