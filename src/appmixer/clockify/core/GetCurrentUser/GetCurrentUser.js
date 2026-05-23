'use strict';

const lib = require('../../lib');

module.exports = {

    async receive(context) {
        const { includeMemberships } = context.messages.in.content;

        const user = await lib.request(context, {
            method: 'GET',
            url: '/user',
            params: lib.compact({
                'include-memberships': includeMemberships
            })
        });

        return context.sendJson(user, 'out');
    }
};
