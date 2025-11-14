'use strict';

module.exports = {

    type: 'apiKey',

    definition: {

        auth: {
            apiKey: {
                type: 'text',
                name: 'API Key',
                tooltip: 'Log into your New Relic account and find your API Key in the API Keys section.'
            },
            region: {
                type: 'select',
                name: 'Region',
                tooltip: 'Optional. Choose the region for your New Relic account. Select EU if your account is in the EU region.',
                options: [
                    { label: 'Global (default)', value: '' },
                    { label: 'EU', value: 'eu' }
                ]
            }
        },

        async requestProfileInfo(context) {
            const apiKey = context.apiKey || '';
            const regionSuffix = context.region === 'eu' ? ' (EU)' : '';
            return {
                key: apiKey.substr(0, 3) + '...' + apiKey.substr(-4) + regionSuffix
            };
        },

        accountNameFromProfileInfo: 'key',

        validate: async (context) => {
            const host = (context.region === 'eu') ? 'https://api.eu.newrelic.com' : 'https://api.newrelic.com';
            const response = await context.httpRequest({
                method: 'GET',
                url: `${host}/v2/applications.json`,
                headers: {
                    'X-Api-Key': context.apiKey
                }
            });
            if (!response.data || typeof response.data !== 'object') {
                throw new Error('Authentication failed: Unexpected response from New Relic API.');
            }
            return true;
        }
    }
};
