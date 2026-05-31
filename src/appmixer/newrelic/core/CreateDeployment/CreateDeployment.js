'use strict';

module.exports = {

    async receive(context) {

        const { applicationId, revision, changelog, description, user } = context.messages.in.content;

        if (!applicationId) {
            throw new context.CancelError('Application ID is required!');
        }

        if (!revision) {
            throw new context.CancelError('Revision is required!');
        }

        const deploymentData = {
            revision
        };

        if (changelog) {
            deploymentData.changelog = changelog;
        }

        if (description) {
            deploymentData.description = description;
        }

        if (user) {
            deploymentData.user = user;
        }

        const lib = require('../../lib');
        const host = lib.getApiHost(context);
        const { data } = await context.httpRequest({
            method: 'POST',
            url: `${host}/v2/applications/${applicationId}/deployments.json`,
            headers: {
                'X-Api-Key': context.auth.apiKey,
                'Content-Type': 'application/json'
            },
            data: {
                deployment: deploymentData
            }
        });

        return context.sendJson(data.deployment, 'out');
    }
};
