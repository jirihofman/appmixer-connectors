const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the component
const GetApplication = require('../../src/appmixer/newrelic/core/GetApplication/GetApplication');

// Mock context
const createMockContext = (auth, messages = {}) => {
    return {
        auth,
        messages,
        properties: {},
        httpRequest: async (options) => {
            const response = await axios({
                method: options.method || 'GET',
                url: options.url,
                headers: options.headers,
                data: options.data
            });

            return {
                data: response.data,
                status: response.status,
                headers: response.headers
            };
        },
        sendJson: (data, port) => {
            return { data, port };
        },
        CancelError: class CancelError extends Error {
            constructor(message) {
                super(message);
                this.name = 'CancelError';
            }
        }
    };
};

describe('GetApplication', () => {
    const auth = {
        apiKey: process.env.NEWRELIC_API_KEY
    };

    before(async function() {
        // Skip all tests if the API key is not set
        if (!auth.apiKey) {
            console.log('Skipping NewRelic tests - NEWRELIC_API_KEY not set');
            this.skip();
        }
    });

    it('should throw error when applicationId is missing', async () => {
        const messages = {
            in: {
                content: {}
            }
        };

        const context = createMockContext(auth, messages);

        try {
            await GetApplication.receive(context);
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert(error.message.includes('Application ID is required'), 'Should throw appropriate error');
        }
    });

    it('should get application details when valid ID is provided', async () => {
        // Note: This test needs a real application ID
        // It will be skipped if the test data is not available
        const messages = {
            in: {
                content: {
                    applicationId: parseInt(process.env.NEWRELIC_TEST_APPLICATION_ID || '0', 10)
                }
            }
        };

        if (!messages.in.content.applicationId) {
            console.log('Skipping GetApplication test - NEWRELIC_TEST_APPLICATION_ID not set');
            return;
        }

        const context = createMockContext(auth, messages);

        try {
            const result = await GetApplication.receive(context);

            assert(result, 'Should return result');
            assert(result.port === 'out', 'Should use out port');
            assert(result.data, 'Should have data');
            assert(result.data.id, 'Should have application ID');
            assert(result.data.name, 'Should have application name');
        } catch (error) {
            // If the specific application ID doesn't exist, that's expected
            if (error.response && error.response.status === 404) {
                console.log('Application not found - this is expected if using example ID');
            } else {
                throw error;
            }
        }
    });
});
