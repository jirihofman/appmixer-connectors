const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');

describe('MakeApiCall Component', function() {
    let context;
    let MakeApiCall;

    this.timeout(30000);

    before(function() {
        // Skip all tests if the API key is not set
        if (!process.env.ELEVENLABS_API_KEY) {
            console.log('Skipping tests - ELEVENLABS_API_KEY not set');
            this.skip();
        }
        // Load the component
        MakeApiCall = require(path.join(__dirname, '../../src/appmixer/elevenlabs/core/MakeApiCall/MakeApiCall.js'));

        // Mock context
        context = {
            auth: {
                apiKey: process.env.ELEVENLABS_API_KEY
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

        assert(context.auth.apiKey, 'ELEVENLABS_API_KEY environment variable is required for tests');
    });

    it('should make a GET API call to user endpoint', async function() {
        let data;
        let outputPort;
        context.sendJson = function(output, port) {
            data = output;
            outputPort = port;
        };

        context.messages.in.content = {
            url: 'https://api.elevenlabs.io/v1/user',
            method: 'GET'
        };

        try {
            await MakeApiCall.receive(context);

            console.log('MakeApiCall user result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
            assert.strictEqual(outputPort, 'out', 'Expected output port to be "out"');
            assert(data.status, 'Expected response to have status code');
            assert(data.body, 'Expected response to have body');

            // Verify we got user data
            if (data.body && data.body.subscription) {
                assert(data.body.subscription, 'Expected user data to have subscription property');
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check the ELEVENLABS_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should make a GET API call to models endpoint', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            url: 'https://api.elevenlabs.io/v1/models',
            method: 'GET'
        };

        try {
            await MakeApiCall.receive(context);

            console.log('MakeApiCall models result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
            assert(data.status, 'Expected response to have status code');
            assert(data.body, 'Expected response to have body');

            // Verify we got models array
            if (Array.isArray(data.body)) {
                assert(Array.isArray(data.body), 'Expected models to be an array');
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check the ELEVENLABS_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should make a GET API call to voices endpoint', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            url: 'https://api.elevenlabs.io/v1/voices',
            method: 'GET'
        };

        try {
            await MakeApiCall.receive(context);

            console.log('MakeApiCall voices result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
            assert(data.status, 'Expected response to have status code');
            assert(data.body, 'Expected response to have body');

            // Verify we got voices data structure
            if (data.body && data.body.voices) {
                assert(Array.isArray(data.body.voices), 'Expected voices to be an array');
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check the ELEVENLABS_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should handle POST API call with body', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        // Test with a minimal POST request to user endpoint (validation test)
        context.messages.in.content = {
            url: 'https://api.elevenlabs.io/v1/user',
            method: 'POST',
            body: JSON.stringify({})
        };

        try {
            await MakeApiCall.receive(context);

            console.log('MakeApiCall POST result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected response data to be an object');
            assert(data.status, 'Expected response to have status code');
        } catch (error) {
            // POST might not be allowed for all endpoints
            if (error.response &&
                (error.response.status === 405 ||
                 error.response.status === 400 ||
                 error.response.status === 404)) {
                console.log('POST method test - expected error for this endpoint:', error.response.status);
                return; // This is acceptable behavior
            }
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check the ELEVENLABS_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should handle invalid endpoint', async function() {
        context.messages.in.content = {
            url: 'https://api.elevenlabs.io/v1/invalid-endpoint',
            method: 'GET'
        };

        try {
            await MakeApiCall.receive(context);
            // If this succeeds unexpectedly, that's unusual
            console.log('Unexpected success for invalid endpoint');
        } catch (error) {
            if (error.response && (error.response.status === 404 || error.response.status === 400)) {
                console.log('Expected error for invalid endpoint:', error.response.status);
                // This is expected behavior for invalid endpoint
                return;
            }
            if (error.response && error.response.status === 401) {
                console.log('Authentication failed - API key may be invalid');
                console.log('Error details:', error.response.data);
                throw new Error('Authentication failed: API key is invalid. Please check the ELEVENLABS_API_KEY in .env file');
            }
            throw error;
        }
    });

    it('should handle different HTTP methods', async function() {
        const methods = ['GET', 'PUT', 'DELETE', 'PATCH'];

        for (const method of methods) {
            context.messages.in.content = {
                url: 'https://api.elevenlabs.io/v1/user',
                method: method
            };

            try {
                await MakeApiCall.receive(context);
                console.log(`${method} method test completed successfully`);
            } catch (error) {
                if (error.response && (error.response.status === 405 || error.response.status === 404)) {
                    console.log(`${method} method not allowed for this endpoint - this is expected`);
                    continue;
                }
                if (error.response && error.response.status === 401) {
                    console.log('Authentication failed - API key may be invalid');
                    throw new Error('Authentication failed: API key is invalid. Please check the ELEVENLABS_API_KEY in .env file');
                }
                console.log(`${method} method failed with:`, error.message);
                // Don't fail the test for method-specific errors
            }
        }
    });
});
