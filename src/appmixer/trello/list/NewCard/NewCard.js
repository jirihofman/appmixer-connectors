'use strict';
const commons = require('../../trello-commons');

/**
 * Process cards to find newly added.
 * @param {Set} knownCards
 * @param {Set} actualCards
 * @param {Set} newCards
 * @param {Object} card
 */
function processCards(knownCards, actualCards, newCards, card) {

    if (knownCards && !knownCards.has(card['id'])) {
        newCards.add(card);
    }
    actualCards.add(card['id']);
}

/**
 * Component which triggers whenever new card is added to a board or to a board list if
 * certain board list is specified.
 * @extends {Component}
 */
module.exports = {

    async tick(context) {

        let lock;
        try {
            lock = await context.lock(context.componentId, {
                ttl: parseInt(context.config.lockTTL, 10) || 1000 * 60 * 5,
                maxRetryCount: 0
            });

            let { boardId, boardListId } = context.properties;

            let url;
            if (boardListId) {
                url = '/1/lists/' + boardListId + '/cards';
            } else {
                url = '/1/boards/' + boardId + '/cards';
            }

            const { data: res } = await context.httpRequest({
                headers: { 'Content-Type': 'application/json' },
                url: `https://api.trello.com${url}?${commons.getAuthQueryParams(context)}`
            });

            const knownCards = await context.stateGet('known') || [];
            let known = new Set(knownCards);
            let actual = new Set();
            let diff = new Set();

            res.forEach(processCards.bind(null, known, actual, diff));

            if (diff.size) {
                await Promise.all(Array.from(diff).map(card => {
                    return context.sendJson(card, 'card');
                }));
            }
            await context.stateSet('known', Array.from(actual));
        } finally {
            if (lock) {
                lock.unlock();
            }
        }
    }
};

