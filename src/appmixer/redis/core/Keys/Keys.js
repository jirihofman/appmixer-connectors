'use strict';

const { createRedisClient } = require('../../common');

module.exports = {
    async receive(context) {
        const { pattern } = context.messages.in.content;

        if (!pattern) {
            throw new context.CancelError('Pattern is required!');
        }

        let client;
        try {
            client = createRedisClient(context.auth);

            // Get keys matching pattern
            const keys = await client.keys(pattern);

            return context.sendJson({ 
                keys, 
                count: keys.length 
            }, 'out');
        } finally {
            if (client) {
                await client.quit();
            }
        }
    }
};
