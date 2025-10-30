'use strict';

/**
 * Component for making a generic API Call to Asana API
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;

        // Asana API base URL
        const baseUrl = 'https://app.asana.com/api/1.0';

        // If the URL starts with http:// or https://, use it as-is
        // Otherwise, prepend the base URL
        const fullUrl = url.startsWith('http://') || url.startsWith('https://')
            ? url
            : baseUrl + (url.startsWith('/') ? url : `/${url}`);

        const requestOptions = {
            method: method,
            url: fullUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${context.auth.accessToken}`
            }
        };

        if (body) {
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
            const axiosError = error.response?.data;
            // Extract error message from Asana's error structure
            let errorMessage = '';
            if (axiosError?.errors && Array.isArray(axiosError.errors) && axiosError.errors.length > 0) {
                errorMessage = axiosError.errors[0].message;
            } else if (axiosError?.message) {
                errorMessage = axiosError.message;
            }
            if (errorMessage) {
                error.message = `${error.message}: ${errorMessage}`;
            }
            throw error;
        }
    }
};
