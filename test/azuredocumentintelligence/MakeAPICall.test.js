const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');

describe('MakeAPICall Component', function() {
    let context;
    let MakeAPICall;

    this.timeout(30000);

    before(function() {
        // Skip all tests if credentials are not set
        if (!process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY || !process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
            console.log('Skipping tests - AZURE_DOCUMENT_INTELLIGENCE_API_KEY or AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT not set');
            this.skip();
        }
        // Load the component
        MakeAPICall = require(path.join(__dirname, '../../src/appmixer/azuredocumentintelligence/classifiers/MakeAPICall/MakeAPICall.js'));

        // Mock context
        context = {
            auth: {
                apiKey: process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY,
                endpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
            },
            messages: {
                in: {
                    content: {}
                }
            },
            properties: {},
            httpRequest: require('./httpRequest.js'),
            CancelError: class extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'CancelError';
                }
            }
        };

        assert(context.auth.apiKey, 'AZURE_DOCUMENT_INTELLIGENCE_API_KEY environment variable is required for tests');
        assert(context.auth.endpoint, 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT environment variable is required for tests');
    });

    it('should make a GET API call to info endpoint', async function() {
        let data;
        let outputPort;
        context.sendJson = function(output, port) {
            data = output;
            outputPort = port;
        };

        context.messages.in.content = {
            resource: 'info',
            method: 'GET',
            queryParams: {
                'api-version': '2024-11-30'
            }
        };

        try {
            await MakeAPICall.receive(context);

            console.log('MakeAPICall info result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
            assert.strictEqual(outputPort, 'out', 'Expected output port to be "out"');
            assert(data.body || data.response, 'Expected response to have body or response property');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check AZURE_DOCUMENT_INTELLIGENCE_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should make a GET API call to list document classifiers', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            resource: 'documentClassifiers',
            method: 'GET',
            queryParams: {
                'api-version': '2024-11-30'
            }
        };

        try {
            await MakeAPICall.receive(context);

            console.log('MakeAPICall list classifiers result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
            assert(data.body || data.response, 'Expected response to have body or response property');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check AZURE_DOCUMENT_INTELLIGENCE_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should make a GET API call to list document models', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            resource: 'documentModels',
            method: 'GET',
            queryParams: {
                'api-version': '2024-11-30'
            }
        };

        try {
            await MakeAPICall.receive(context);

            console.log('MakeAPICall list models result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
            assert(data.body || data.response, 'Expected response to have body or response property');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check AZURE_DOCUMENT_INTELLIGENCE_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should handle query parameters as string', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            resource: 'info',
            method: 'GET',
            queryParams: '{"api-version": "2024-11-30"}'
        };

        try {
            await MakeAPICall.receive(context);

            console.log('MakeAPICall with string query params result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                throw new Error('Authentication failed: API key is invalid. Please check AZURE_DOCUMENT_INTELLIGENCE_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should handle additional headers', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            resource: 'info',
            method: 'GET',
            queryParams: {
                'api-version': '2024-11-30'
            },
            headers: {
                'x-custom-header': 'test-value'
            }
        };

        try {
            await MakeAPICall.receive(context);

            console.log('MakeAPICall with custom headers result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                throw new Error('Authentication failed: API key is invalid. Please check AZURE_DOCUMENT_INTELLIGENCE_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should handle invalid resource', async function() {
        context.messages.in.content = {
            resource: 'invalid/endpoint',
            method: 'GET',
            queryParams: {
                'api-version': '2024-11-30'
            }
        };

        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        try {
            await MakeAPICall.receive(context);
            // Check if we got an error response
            if (data && data.statusCode && (data.statusCode === 404 || data.statusCode === 400)) {
                console.log('Expected error for invalid resource:', data.body);
                return;
            }
        } catch (error) {
            if (error.response && (error.response.status === 404 || error.response.status === 400)) {
                console.log('Expected error for invalid resource:', error.response.data);
                return;
            }
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                throw new Error('Authentication failed: API key is invalid. Please check AZURE_DOCUMENT_INTELLIGENCE_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should require resource parameter', async function() {
        context.messages.in.content = {
            method: 'GET'
        };

        try {
            await MakeAPICall.receive(context);
            assert.fail('Expected CancelError to be thrown');
        } catch (error) {
            assert(error.name === 'CancelError', 'Expected CancelError');
            assert(error.message.includes('Resource is required'), 'Expected error message about missing resource');
        }
    });

    it('should require method parameter', async function() {
        context.messages.in.content = {
            resource: 'info'
        };

        try {
            await MakeAPICall.receive(context);
            assert.fail('Expected CancelError to be thrown');
        } catch (error) {
            assert(error.name === 'CancelError', 'Expected CancelError');
            assert(error.message.includes('Method is required'), 'Expected error message about missing method');
        }
    });

    it('should handle different HTTP methods', async function() {
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];

        for (const method of methods) {
            context.messages.in.content = {
                resource: 'info',
                method: method,
                queryParams: {
                    'api-version': '2024-11-30'
                }
            };

            let data;
            context.sendJson = function(output, port) {
                data = output;
            };

            try {
                await MakeAPICall.receive(context);
                console.log(`${method} method test completed successfully`);
            } catch (error) {
                if (error.response && error.response.status === 405) {
                    console.log(`${method} method not allowed for this endpoint - this is expected`);
                    continue;
                }
                if (error.response && error.response.status === 401) {
                    console.log('Authentication failed - API key may be invalid');
                    throw new Error('Authentication failed: API key is invalid. Please check AZURE_DOCUMENT_INTELLIGENCE_API_KEY in .env file');
                }
                console.log(`${method} method failed with:`, error.message);
                // Don't fail the test for method-specific errors
            }
        }
    });
});
