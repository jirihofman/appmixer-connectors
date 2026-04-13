'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');

describe('MakeApiCall Component', function() {
    let context;
    let MakeApiCall;

    this.timeout(30000);

    before(function() {
        // Skip all tests if environment variables are not set
        if (!process.env.BIGCOMMERCE_ACCESS_TOKEN || !process.env.BIGCOMMERCE_STORE_HASH) {
            console.log('Skipping tests - BIGCOMMERCE_ACCESS_TOKEN or BIGCOMMERCE_STORE_HASH not set');
            this.skip();
        }

        // Load the component
        MakeApiCall = require(path.join(__dirname, '../../src/appmixer/bigCommerce/core/MakeApiCall/MakeApiCall.js'));

        // Mock context
        context = {
            auth: {
                storeHash: process.env.BIGCOMMERCE_STORE_HASH,
                accessToken: process.env.BIGCOMMERCE_ACCESS_TOKEN
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

        assert(context.auth.accessToken, 'BIGCOMMERCE_ACCESS_TOKEN environment variable is required for tests');
        assert(context.auth.storeHash, 'BIGCOMMERCE_STORE_HASH environment variable is required for tests');
    });

    it('should make a GET request with relative URL', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            url: '/v2/store',
            method: 'GET'
        };

        try {
            await MakeApiCall.receive(context);

            console.log('MakeApiCall GET result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected data to be an object');
            assert(typeof data.status === 'number', 'Expected status to be a number');
            assert(data.body && typeof data.body === 'object', 'Expected body to be an object');
            assert(data.body.name, 'Expected store name in response');
        } catch (error) {
            console.error('MakeApiCall GET test error:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    });

    it('should make a GET request with full URL', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        const fullUrl = `https://api.bigcommerce.com/stores/${context.auth.storeHash}/v2/store`;
        context.messages.in.content = {
            url: fullUrl,
            method: 'GET'
        };

        try {
            await MakeApiCall.receive(context);

            console.log('MakeApiCall full URL result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected data to be an object');
            assert(typeof data.status === 'number', 'Expected status to be a number');
            assert(data.body && typeof data.body === 'object', 'Expected body to be an object');
        } catch (error) {
            console.error('MakeApiCall full URL test error:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    });

    it('should make a GET request to list products', async function() {
        let data;
        context.sendJson = function(output, port) {
            data = output;
        };

        context.messages.in.content = {
            url: '/v3/catalog/products',
            method: 'GET'
        };

        try {
            await MakeApiCall.receive(context);

            console.log('MakeApiCall products result:', JSON.stringify(data, null, 2));

            assert(data && typeof data === 'object', 'Expected data to be an object');
            assert(typeof data.status === 'number', 'Expected status to be a number');
            assert(data.body && typeof data.body === 'object', 'Expected body to be an object');
            assert(Array.isArray(data.body.data), 'Expected data.body.data to be an array');
        } catch (error) {
            console.error('MakeApiCall products test error:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    });
});
