'use strict';

module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        if (!url) {
            throw new context.CancelError('API Endpoint URL is required');
        }

        if (!method) {
            throw new context.CancelError('HTTP Method is required');
        }

        const requestOptions = {
            method: method,
            url: url,
            headers: {
                'Authorization': `Bearer ${context.auth.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            try {
                requestOptions.data = JSON.parse(body);
            } catch (parseError) {
                throw new context.CancelError(`Invalid JSON in request body: ${parseError.message}`);
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
            // Handle HTTP error responses
            if (error.response) {
                const errorMessage = error.response.data?.message || error.message;
                throw new Error(`API request failed with status ${error.response.status}: ${errorMessage}`);
            }
            // Handle network or other errors
            throw new Error(`API request failed: ${error.message}`);
        }
    }
};
