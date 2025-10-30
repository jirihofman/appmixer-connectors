'use strict';
const AWS = require('aws-sdk');

/**
 * Component for making a generic API Call to AWS SNS
 * @extends {Component}
 */
module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;
        const region = context.properties.region;

        if (!url) {
            throw new context.CancelError('API Endpoint URL is required');
        }

        if (!method) {
            throw new context.CancelError('HTTP Method is required');
        }

        if (!region) {
            throw new context.CancelError('Region is required');
        }

        // Configure AWS SDK
        AWS.config.update({
            signatureVersion: 'v4',
            region: region
        });

        const { accessKeyId, secretKey } = context.auth;
        const credentials = new AWS.Credentials(accessKeyId, secretKey);

        // Create an endpoint and signer for manual API calls
        const endpoint = new AWS.Endpoint(url);
        const request = new AWS.HttpRequest(endpoint, region);
        
        request.method = method;
        request.headers['Host'] = endpoint.host;
        request.headers['Content-Type'] = 'application/x-www-form-urlencoded';

        if (body) {
            request.body = body;
            request.headers['Content-Length'] = Buffer.byteLength(request.body);
        }

        // Sign the request
        const signer = new AWS.Signers.V4(request, 'sns');
        signer.addAuthorization(credentials, new Date());

        try {
            // Make the HTTP request using context.httpRequest
            const requestOptions = {
                method: request.method,
                url: url,
                headers: request.headers,
                data: request.body
            };

            const response = await context.httpRequest(requestOptions);

            return context.sendJson({
                status: response.status,
                headers: response.headers,
                body: response.data
            }, 'out');
        } catch (error) {
            const axiosError = error.response?.data;
            error.message = `${error.message}: ${axiosError?.message || axiosError?.Message || ''}`;
            throw error;
        }
    }
};
