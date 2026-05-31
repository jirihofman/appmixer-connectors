'use strict';

module.exports = {

    async receive(context) {

        const { resource, method, body, queryParams, headers } = context.messages?.in?.content || {};

        if (!resource) {
            throw new context.CancelError('Resource is required');
        }

        if (!method) {
            throw new context.CancelError('Method is required');
        }

        // Prepare request configuration
        const requestConfig = {
            method: method.toUpperCase(),
            url: `${context.auth.endpoint}/${resource}`,
            headers: {
                'Ocp-Apim-Subscription-Key': context.auth.apiKey
            }
        };

        // Parse and add additional headers if provided
        if (headers) {
            try {
                const additionalHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
                Object.assign(requestConfig.headers, additionalHeaders);
            } catch (e) {
                throw new context.CancelError('Invalid headers format. Please provide valid JSON.');
            }
        }

        // Parse and add query parameters if provided
        if (queryParams) {
            try {
                requestConfig.params = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams;
            } catch (e) {
                throw new context.CancelError('Invalid query parameters format. Please provide valid JSON.');
            }
        }

        // Add body for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
            try {
                if (typeof body === 'string') {
                    requestConfig.data = JSON.parse(body);
                } else {
                    requestConfig.data = body;
                }
                if (!requestConfig.headers['Content-Type']) {
                    requestConfig.headers['Content-Type'] = 'application/json';
                }
            } catch (e) {
                throw new context.CancelError('Invalid body format. Please provide valid JSON.');
            }
        }

        try {
            const response = await context.httpRequest(requestConfig);

            // Extract response details
            const result = {
                statusCode: response.status || 200,
                headers: response.headers || {},
                body: response.data || response,
                response: {
                    statusCode: response.status || 200,
                    headers: response.headers || {},
                    body: response.data || response
                }
            };

            return context.sendJson(result, 'out');
        } catch (error) {
            if (error.response) {
                // Return error response details
                const errorResult = {
                    statusCode: error.response.status,
                    headers: error.response.headers || {},
                    body: error.response.data || error.message,
                    response: {
                        statusCode: error.response.status,
                        headers: error.response.headers || {},
                        body: error.response.data || error.message
                    }
                };
                return context.sendJson(errorResult, 'out');
            }
            throw new context.CancelError(error.message || 'API call failed');
        }
    }
};
