'use strict';

const { createRedisClient } = require('../../common');

module.exports = {
    async receive(context) {
        const { key, value, expirationSeconds } = context.messages.in.content;

        if (!key) {
            throw new context.CancelError('Key is required!');
        }
        if (value === undefined || value === null) {
            throw new context.CancelError('Value is required!');
        }

        let client;
        try {
            client = createRedisClient(context.auth);

            // Set the key-value pair
            if (expirationSeconds && expirationSeconds > 0) {
                // Set with expiration
                await client.setex(key, expirationSeconds, value);
            } else {
                // Set without expiration
                await client.set(key, value);
            }

            return context.sendJson({ key, status: 'OK' }, 'out');
        } finally {
            if (client) {
                await client.quit();
            }
        }
    }
};
