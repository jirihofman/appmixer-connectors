'use strict';

/**
 * Component for making a generic API Call to Brevo API
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        const requestOptions = {
            method: method,
            url: url,
            headers: {
                'api-key': context.auth.apiKey,
                'accept': 'application/json',
                'Content-Type': 'application/json'
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
            error.message = `${error.message}: ${axiosError?.message || ''}`;
            throw error;
        }
    }
};
