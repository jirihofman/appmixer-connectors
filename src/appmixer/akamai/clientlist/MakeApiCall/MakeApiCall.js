'use strict';

const { generateAuthorizationHeader } = require('../../lib');

/**
 * Component for making a generic API Call
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;
        const { hostnameUrl, accessToken, clientSecret, clientToken } = context.auth;

        // Parse body once if provided
        let parsedBody;
        if (body) {
            try {
                parsedBody = JSON.parse(body);
            } catch (error) {
                throw new Error(`Invalid JSON in request body: ${error.message}`);
            }
        }

        // Extract path from URL
        // URL can be either a full URL (https://...) or just a path (/client-list/v1/...)
        let path;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Full URL - extract path
            const urlObj = new URL(url);
            path = urlObj.pathname + urlObj.search;
        } else {
            // Relative path
            path = url;
        }

        // Generate authorization header using Akamai EdgeGrid
        const { url: fullUrl, method: requestMethod, headers: { Authorization } } = generateAuthorizationHeader({
            hostnameUrl,
            accessToken,
            clientToken,
            clientSecret,
            method: method,
            path: path,
            body: parsedBody
        });

        const requestOptions = {
            method: requestMethod,
            url: fullUrl,
            headers: {
                'Authorization': Authorization,
                'Content-Type': 'application/json'
            }
        };

        if (parsedBody) {
            requestOptions.data = parsedBody;
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
