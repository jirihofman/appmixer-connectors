'use strict';

module.exports = {
    rules: [
        {
            limit: 20,
            window: 1000,
            throttling: 'window-sliding',
            queueing: 'fifo',
            resource: 'requests',
            scope: 'userId'
        }
    ]
};
