'use strict';

/**
 * Component for making a generic API Call to Apigee API
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        // Determine the full URL
        // If URL starts with https://, use it as-is
        // Otherwise, prepend the base URL
        let fullUrl = url;
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            fullUrl = 'https://apigee.googleapis.com' + (url.startsWith('/') ? url : '/' + url);
        }

        const requestOptions = {
            method: method,
            url: fullUrl,
            headers: {
                'Authorization': `Bearer ${context.auth.accessToken}`,
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
