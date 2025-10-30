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
