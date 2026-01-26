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

            // Delete the key
            const deletedCount = await client.del(key);

            return context.sendJson({ key, deletedCount }, 'out');
        } finally {
            if (client) {
                await client.quit();
            }
        }
    }
};
