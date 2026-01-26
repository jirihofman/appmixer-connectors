'use strict';

module.exports = {
    type: 'apiKey',

    definition: () => {
        return {
            tokenType: 'authentication-token',

            accountNameFromProfileInfo: (context) => {
                return `${context.host || context.connectionUri}:${context.port || ''}`;
            },

            auth: {
                host: {
                    type: 'text',
                    name: 'Host',
                    tooltip: 'Redis server hostname or IP address (e.g., "127.0.0.1" or "redis.example.com")',
                    required: false
                },
                port: {
                    type: 'text',
                    name: 'Port',
                    tooltip: 'Redis server port (default: 6379)',
                    required: false
                },
                username: {
                    type: 'text',
                    name: 'Username',
                    tooltip: 'Redis username (required for Redis >= 6 with ACL)',
                    required: false
                },
                password: {
                    type: 'text',
                    name: 'Password',
                    tooltip: 'Redis password',
                    required: false
                },
                db: {
                    type: 'text',
                    name: 'Database',
                    tooltip: 'Redis database number (default: 0)',
                    required: false
                },
                connectionUri: {
                    type: 'text',
                    name: 'Connection URI (Alternative)',
                    tooltip: 'Full Redis connection URI (e.g., redis://user:pass@host:port/db). If provided, overrides individual fields.',
                    required: false
                }
            },

            validate: async (context) => {
                const Redis = require('ioredis');
                let client;

                try {
                    // If connectionUri is provided, use it
                    if (context.connectionUri && context.connectionUri.trim()) {
                        client = new Redis(context.connectionUri);
                    } else {
                        // Otherwise use individual fields
                        const options = {
                            host: context.host || '127.0.0.1',
                            port: parseInt(context.port) || 6379,
                            db: parseInt(context.db) || 0
                        };

                        if (context.username) {
                            options.username = context.username;
                        }
                        if (context.password) {
                            options.password = context.password;
                        }

                        client = new Redis(options);
                    }

                    // Test connection with PING
                    await client.ping();
                    return true;
                } catch (error) {
                    throw new Error(`Redis connection failed: ${error.message}`);
                } finally {
                    if (client) {
                        await client.quit();
                    }
                }
            }
        };
    }
};
