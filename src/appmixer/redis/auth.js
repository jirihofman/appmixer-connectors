'use strict';

const Redis = require('ioredis');

module.exports = {

    type: 'apiKey',

    definition: () => {

        return {

            tokenType: 'authentication-token',

            accountNameFromProfileInfo: 'host',

            auth: {
                host: {
                    type: 'text',
                    name: 'Host',
                    tooltip: 'Redis server hostname (e.g., localhost or redis.example.com)'
                },
                port: {
                    type: 'text',
                    name: 'Port',
                    tooltip: 'Redis server port (default: 6379)'
                },
                username: {
                    type: 'text',
                    name: 'Username',
                    tooltip: 'Redis username (optional for ACL-based auth)'
                },
                password: {
                    type: 'password',
                    name: 'Password',
                    tooltip: 'Redis password (if authentication is enabled)'
                },
                database: {
                    type: 'text',
                    name: 'Database',
                    tooltip: 'Redis database number (default: 0)'
                },
                tls: {
                    type: 'toggle',
                    name: 'Use TLS',
                    tooltip: 'Enable TLS/SSL connection'
                }
            },

            requestProfileInfo: async context => {
                return {
                    host: context.host || ''
                };
            },

            validate: async context => {

                const client = new Redis({
                    host: context.host || 'localhost',
                    port: context.port ? Number.parseInt(context.port, 10) : 6379,
                    username: context.username || undefined,
                    password: context.password || undefined,
                    db: context.database ? Number.parseInt(context.database, 10) : 0,
                    tls: context.tls ? {} : undefined,
                    lazyConnect: true
                });

                try {
                    await client.connect();
                    await client.ping();
                    return true;
                } finally {
                    await client.quit();
                }
            }
        };
    }
};
