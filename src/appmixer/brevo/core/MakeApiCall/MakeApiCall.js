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
                'accept': 'application/json'
            }
        };

        if (body) {
            try {
                requestOptions.data = JSON.parse(body);
                requestOptions.headers['Content-Type'] = 'application/json';
            } catch (parseError) {
                throw new Error(`Invalid JSON in request body: ${parseError.message}`);
            }
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
            if (axiosError?.message) {
                error.message = `${error.message}: ${axiosError.message}`;
            }
            throw error;
        }
    }
};
