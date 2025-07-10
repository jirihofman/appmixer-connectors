'use strict';

/**
 * Component for listing members of a specified team.
 * @extends {Component}
 */
module.exports = {

    async receive(context) {

        const { accessToken } = context.auth;
        const { teamId } = context.messages.in.content;

        if (!teamId) {
            throw new Error('Team ID is required');
        }

        try {
            const response = await context.httpRequest({
                method: 'GET',
                url: `https://api.vercel.com/v1/teams/${teamId}/members`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = {
                members: response.data.members || []
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
