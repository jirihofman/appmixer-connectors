'use strict';

module.exports = {

    type: 'apiKey',

    definition: {

        tokenType: 'authentication-token',

        auth: {
            apiKey: {
                type: 'text',
                name: 'API Key',
                tooltip: 'Log into your New Relic account and find your User API Key in the API Keys section. This is a personal API key that starts with "NRAK-".'
            }
        },

        accountNameFromProfileInfo: (context) => {
            return context.profileInfo?.email || 'New Relic User';
        },

        requestProfileInfo: async (context) => {
            const response = await context.httpRequest({
                method: 'GET',
                url: 'https://api.newrelic.com/v2/users.json',
                headers: {
                    'X-Api-Key': context.apiKey
                }
            });

            // Return the first user (typically the authenticated user)
            if (response.data && response.data.users && response.data.users.length > 0) {
                return response.data.users[0];
            }

            // If no user info available, return a basic object with obfuscated API key
            return { apiKey: context.apiKey.substring(0, 8) + '...' };
        },

        validate: async (context) => {
            await context.httpRequest({
                method: 'GET',
                url: 'https://api.newrelic.com/v2/applications.json',
                headers: {
                    'X-Api-Key': context.apiKey
                }
            });
            return true;
        }
    }
};
