'use strict';

/**
 * Component for making a generic API Call to Vercel API
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        const requestOptions = {
            method: method,
            url: url,
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`
            }
        };

        if (body) {
            try {
                requestOptions.data = JSON.parse(body);
            } catch (error) {
                throw new Error(`Invalid JSON in request body: ${error.message}`);
            }
        }

        const response = await context.httpRequest(requestOptions);

        await context.sendJson({
            status: response.status,
            headers: response.headers,
            body: response.data
        }, 'out');
    }
};
