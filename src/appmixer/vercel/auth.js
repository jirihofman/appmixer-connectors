'use strict';

module.exports = {

    type: 'apiKey',

    definition: {

        auth: {
            accessToken: {
                type: 'text',
                name: 'Access Token',
                tooltip: 'Log into your Vercel account and generate an access token in your account settings. You can find this in Settings > Tokens.'
            }
        },

        accountNameFromProfileInfo: 'user.email',

        requestProfileInfo: async (context) => {
            return context.httpRequest({
                method: 'GET',
                url: 'https://api.vercel.com/v2/user',
                headers: {
                    'Authorization': `Bearer ${context.accessToken}`
                }
            });
        },

        validate: async (context) => {
            await context.httpRequest({
                method: 'GET',
                url: 'https://api.vercel.com/v2/user',
                headers: {
                    'Authorization': `Bearer ${context.accessToken}`
                }
            });
            return true;
        }
    }
};
