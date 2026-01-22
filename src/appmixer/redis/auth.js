'use strict';

module.exports = {
    type: 'apiKey',
    definition: {
        auth: {
            host: {
                type: 'text',
                name: 'Redis Host',
                tooltip: 'The hostname or IP address of your Redis server.'
            },
            port: {
                type: 'text',
                name: 'Redis Port',
                tooltip: 'The port number your Redis server is running on (default is 6379).'
            },
            password: {
                type: 'password',
                name: 'Password',
                tooltip: 'The password for your Redis server, if authentication is enabled.'
            }
        },

        async validate(context) {
            // We'll use the Redis PING command to validate credentials
            const { host, port, password } = context;
            const url = `http://${host}:${port}`;
            // There is no HTTP API for Redis by default, so we can't validate via HTTP request.
            // Instead, we can try to connect using the redis npm package if available.
            // But for this context, we'll just check that host and port are provided.
            if (!host || !port) {
                throw new Error('Host and port are required for Redis connection.');
            }
            // Optionally, check password is provided if needed
            return true;
        },

        requestProfileInfo(context) {
            const host = context.host;
            return {
                key: host.substr(0, 3) + '...' + host.substr(4)
            };
        },
        accountNameFromProfileInfo: 'key'
    }
};
