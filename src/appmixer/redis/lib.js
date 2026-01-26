'use strict';

const Redis = require('ioredis');
const crypto = require('crypto');

const CLIENTS = {};

module.exports = {

    getClient: async context => {

        const clientRecord = ensureClient(context);
        if (clientRecord.connecting) {
            await clientRecord.connecting;
        }
        return clientRecord.client;
    },

    disconnect: async context => {

        const clientId = connectionHash(context.auth);
        const record = CLIENTS[clientId];
        if (!record) {
            return;
        }
        record.components.delete(context.componentId);
        if (record.components.size === 0) {
            await record.client.quit();
            delete CLIENTS[clientId];
        }
    }
};

function ensureClient(context) {

    const clientId = connectionHash(context.auth);
    let record = CLIENTS[clientId];
    if (!record) {
        const client = new Redis({
            host: context.auth.host || 'localhost',
            port: context.auth.port ? Number.parseInt(context.auth.port, 10) : 6379,
            username: context.auth.username || undefined,
            password: context.auth.password || undefined,
            db: context.auth.database ? Number.parseInt(context.auth.database, 10) : 0,
            tls: context.auth.tls ? {} : undefined,
            lazyConnect: true
        });

        const connecting = client.connect();

        record = {
            client,
            connecting,
            components: new Set([context.componentId])
        };
        CLIENTS[clientId] = record;
    } else {
        record.components.add(context.componentId);
    }

    return record;
}

function connectionHash(auth) {

    const authString = stringifySorted(auth || {});
    return crypto.createHash('sha256').update(authString).digest('hex');
}

function stringifySorted(value) {

    if (Array.isArray(value)) {
        return `[${value.map(item => stringifySorted(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return `{${keys.map(key => `${JSON.stringify(key)}:${stringifySorted(value[key])}`).join(',')}}`;
    }

    return JSON.stringify(value);
}
