'use strict';

module.exports = {
    type: 'apiKey',

    definition: {
        tokenType: 'authentication-token',

        auth: {
            apiToken: {
                type: 'text',
                name: 'API Token',
                tooltip: 'Your Better Stack Uptime API token. Get it from https://betterstack.com/settings/api-tokens'
            }
        },

        accountNameFromProfileInfo: (context) => {
            // Return obfuscated API token as account name since Better Stack doesn't provide profile info
            const apiToken = context.profileInfo?.apiToken || context.apiToken;
            if (apiToken) {
                return `betterstack_***${apiToken.slice(-4)}`;
            }
            return 'Better Stack Account';
        },

        requestProfileInfo: async (context) => {
            // Better Stack doesn't have a profile endpoint, return obfuscated API token
            return {
                apiToken: context.apiToken
            };
        },

        validate: async (context) => {
            // Test the API token by listing monitors (limited to 1)
            await context.httpRequest({
                method: 'GET',
                url: 'https://uptime.betterstack.com/api/v2/monitors',
                headers: {
                    'Authorization': `Bearer ${context.apiToken}`
                },
                params: {
                    per_page: 1
                }
            });
            return true;
        }
    }
};
