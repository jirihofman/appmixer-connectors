'use strict';

module.exports = {

    async receive(context) {

        const { applicationId } = context.messages.in.content;

        if (!applicationId) {
            throw new context.CancelError('Application ID is required!');
        }

        const lib = require('../../lib');
        const host = lib.getApiHost(context);
        await context.httpRequest({
            method: 'DELETE',
            url: `${host}/v2/applications/${applicationId}.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        return context.sendJson({}, 'out');
    }
};
