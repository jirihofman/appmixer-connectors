'use strict';
const Blackboard = require('../../sdk');

/**
 * Component for making a generic API Call to Blackboard Learn API
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        const client = new Blackboard(
            context.auth.clientId,
            context.auth.clientSecret,
            context.config.serverUrl,
            context.auth.redirectUrl,
            context.httpRequest
        );

        client.setAccessToken(context.auth.accessToken);

        const requestOptions = {
            method: method,
            url: `${context.config.serverUrl}/learn/api/public${url}`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${context.auth.accessToken}`
            }
        };

        if (body) {
            requestOptions.data = JSON.parse(body);
        }

        try {
            const response = await context.httpRequest(requestOptions);

            return context.sendJson({
                status: response.status,
                headers: response.headers,
                body: response.data
            }, 'out');
        } catch (error) {
            const axiosError = error.response?.data;
            error.message = `${error.message}: ${axiosError?.error?.message || axiosError?.message || ''}`;
            throw error;
        }
    }
};
