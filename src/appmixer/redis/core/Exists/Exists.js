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

            // Check if key exists (returns 1 if exists, 0 if not)
            const result = await client.exists(key);
            const exists = result === 1;

            return context.sendJson({ key, exists }, 'out');
        } finally {
            if (client) {
                await client.quit();
            }
        }
    }
};
