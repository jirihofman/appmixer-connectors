'use strict';

module.exports = {

    async receive(context) {

        const { applicationId } = context.messages.in.content;

        if (!applicationId) {
            throw new context.CancelError('Application ID is required!');
        }

        await context.httpRequest({
            method: 'DELETE',
            url: `https://api.newrelic.com/v2/applications/${applicationId}.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey
            }
        });

        return context.sendJson({}, 'out');
    }
};
