'use strict';

const Redis = require('ioredis');

/**
 * Creates a Redis client instance based on auth configuration
 * @param {Object} auth - Authentication context
 * @returns {Redis} Redis client instance
 */
function createRedisClient(auth) {
    // If connectionUri is provided, use it
    if (auth.connectionUri && auth.connectionUri.trim()) {
        return new Redis(auth.connectionUri);
    }

    // Otherwise use individual fields
    const options = {
        host: auth.host || '127.0.0.1',
        port: parseInt(auth.port) || 6379,
        db: parseInt(auth.db) || 0
    };

    if (auth.username) {
        options.username = auth.username;
    }
    if (auth.password) {
        options.password = auth.password;
    }

    return new Redis(options);
}

module.exports = {
    createRedisClient
};
