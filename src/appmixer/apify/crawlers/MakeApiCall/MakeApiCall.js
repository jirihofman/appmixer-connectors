'use strict';

/**
 * Component for making a generic API Call to Apify API
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        if (!url) {
            throw new context.CancelError('API Endpoint URL is required');
        }

        if (!method) {
            throw new context.CancelError('HTTP Method is required');
        }

        // Determine if URL is absolute or relative
        let fullUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // Relative URL - prepend base URL
            fullUrl = `https://api.apify.com${url.startsWith('/') ? '' : '/'}${url}`;
        }

        // Add token as query parameter for Apify authentication
        const urlObj = new URL(fullUrl);
        urlObj.searchParams.set('token', context.auth.apiToken);

        const requestOptions = {
            method: method,
            url: urlObj.toString(),
            headers: {
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
            error.message = `${error.message}: ${axiosError?.error?.message || axiosError?.message || ''}`;
            throw error;
        }
    }
};
