'use strict';

/**
 * Component for making a generic API Call to ActiveCampaign
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        // Determine if URL is absolute or relative
        let requestUrl;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            requestUrl = url;
        } else {
            // Prepend base URL for relative URLs
            const baseUrl = context.auth.url.replace(/\/$/, '');
            const cleanUrl = url.startsWith('/') ? url : `/${url}`;
            requestUrl = `${baseUrl}/api/3${cleanUrl}`;
        }

        const requestOptions = {
            method: method,
            url: requestUrl,
            headers: {
                'Api-Token': context.auth.apiKey
            }
        };

        // Add Content-Type header only for requests with a body
        if (body) {
            requestOptions.headers['Content-Type'] = 'application/json';
            try {
                requestOptions.data = JSON.parse(body);
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
            // Extract meaningful error from ActiveCampaign API response
            const acError = error.response?.data;
            if (acError?.errors) {
                const errors = acError.errors
                    .map(err => err.title || err.detail || 'Unknown error')
                    .filter(msg => msg)
                    .join(', ');
                if (errors) {
                    error.message = `${error.message}: ${errors}`;
                }
            } else if (acError?.message) {
                error.message = `${error.message}: ${acError.message}`;
            }
            throw error;
        }
    }
};
