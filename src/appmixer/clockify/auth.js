'use strict';

const DEFAULT_API_BASE_URL = 'https://api.clockify.me/api/v1';

const normalizeBaseUrl = (url) => {
    return (url || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
};

module.exports = {

    type: 'apiKey',

    definition: {
        tokenType: 'authentication-token',

        auth: {
            apiKey: {
                type: 'text',
                name: 'API Key',
                tooltip: 'Generate an API key in Clockify Profile settings, Advanced tab, Manage API keys.'
            },
            apiBaseUrl: {
                type: 'text',
                name: 'API Base URL',
                tooltip: 'Clockify API base URL. Use the default unless your workspace uses a regional or subdomain endpoint.',
                defaultValue: DEFAULT_API_BASE_URL
            }
        },

        accountNameFromProfileInfo: 'email',

        requestProfileInfo: async (context) => {
            const { data } = await context.httpRequest({
                method: 'GET',
                url: `${normalizeBaseUrl(context.apiBaseUrl)}/user`,
                headers: {
                    'X-Api-Key': context.apiKey
                },
                params: {
                    'include-memberships': true
                }
            });

            return data;
        },

        validate: async (context) => {
            if (!context.apiKey) {
                throw new Error('API Key is required.');
            }

            await context.httpRequest({
                method: 'GET',
                url: `${normalizeBaseUrl(context.apiBaseUrl)}/user`,
                headers: {
                    'X-Api-Key': context.apiKey
                }
            });

            return true;
        }
    }
};
