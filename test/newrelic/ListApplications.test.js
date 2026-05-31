const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the component
const ListApplications = require('../../src/appmixer/newrelic/core/ListApplications/ListApplications');

// Mock context
const createMockContext = (auth, messages = {}, properties = {}) => {
    return {
        auth,
        messages,
        properties,
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
        }
    };
};

describe('ListApplications', () => {
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

    it('should list applications', async () => {
        const messages = {
            in: {
                content: {
                    outputType: 'array'
                }
            }
        };

        const context = createMockContext(auth, messages);

        const result = await ListApplications.receive(context);

        assert(result, 'Should return result');
        assert(result.port === 'out', 'Should use out port');
        assert(result.data, 'Should have data');
        assert(Array.isArray(result.data.result), 'Should have result array');
        assert(typeof result.data.count === 'number', 'Should have count');
    });

    it('should handle first outputType', async () => {
        const messages = {
            in: {
                content: {
                    outputType: 'first'
                }
            }
        };

        const context = createMockContext(auth, messages);

        try {
            const result = await ListApplications.receive(context);

            // If there are applications, check the structure
            if (result) {
                assert(result.port === 'out', 'Should use out port');
                assert(result.data, 'Should have data');
                assert(typeof result.data.index === 'number', 'Should have index');
                assert(typeof result.data.count === 'number', 'Should have count');
            }
        } catch (error) {
            // If there are no applications, it should throw CancelError
            assert(error.message.includes('No records available'), 'Should throw appropriate error for empty result');
        }
    });
});
