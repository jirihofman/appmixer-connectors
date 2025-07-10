'use strict';

/**
 * Component for listing all teams the authenticated user is a member of.
 * @extends {Component}
 */
module.exports = {

    async receive(context) {

        const { accessToken } = context.auth;

        try {
            const response = await context.httpRequest({
                method: 'GET',
                url: 'https://api.vercel.com/v2/teams',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = {
                teams: response.data.teams || []
            };

            return context.sendJson(result, 'out');

        } catch (error) {
            if (error.response) {
                throw new Error(`Vercel API error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
            }
            throw error;
        }
    }
};
