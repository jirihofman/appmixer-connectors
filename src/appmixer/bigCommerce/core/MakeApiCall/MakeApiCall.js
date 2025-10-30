'use strict';

/**
 * Component for making a generic API Call to BigCommerce API
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        // Determine if URL is relative or absolute
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // Relative URL - prepend base URL with store hash
            finalUrl = `https://api.bigcommerce.com/stores/${context.auth.storeHash}${url}`;
        }

        const requestOptions = {
            method: method,
            url: finalUrl,
            headers: {
                'X-Auth-Token': context.auth.accessToken,
                'Accept': 'application/json',
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
            // Enhanced error handling for BigCommerce API
            const axiosError = error.response?.data;
            const errorMessage = axiosError?.title || axiosError?.detail || axiosError?.message || error.message;
            error.message = `BigCommerce API Error: ${errorMessage}`;
            throw error;
        }
    }
};
