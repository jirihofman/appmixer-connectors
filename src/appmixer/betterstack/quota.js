'use strict';

module.exports = {
    rules: [
        // General API rate limit
        // Better Stack doesn't publicly document specific rate limits
        // Using conservative limits to avoid abuse
        {
            limit: 100,
            window: 1000 * 60, // 1 minute
            throttling: 'window-sliding',
            queueing: 'fifo',
            resource: 'requests',
            scope: 'userId'
        },
        // Monitor creation has lower limits to prevent abuse
        {
            limit: 10,
            window: 1000 * 60, // 1 minute
            throttling: 'window-sliding',
            queueing: 'fifo',
            resource: 'monitors.create',
            scope: 'userId'
        },
        // Heartbeat creation can be more frequent
        {
            limit: 500,
            window: 1000 * 60, // 1 minute
            throttling: 'window-sliding',
            queueing: 'fifo',
            resource: 'heartbeats.create',
            scope: 'userId'
        }
    ]
};
