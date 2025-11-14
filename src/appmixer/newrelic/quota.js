'use strict';

// NewRelic API rate limits:
// REST API v2: Generally allows up to 1000 requests per minute per account
module.exports = {
    rules: [
        {
            limit: 1000,
            window: 1000 * 60, // 1 minute
            throttling: 'window-sliding',
            queueing: 'fifo',
            resource: 'api.requests',
            scope: 'userId'
        }
    ]
};
