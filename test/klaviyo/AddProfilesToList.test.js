const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

describe('AddProfilesToList', () => {

    let AddProfilesToList;
    let context;

    before(function() {
        // Skip all tests if the access token is not set
        if (!process.env.KLAVIYO_API_KEY) {
            console.log('Skipping tests - KLAVIYO_API_KEY not set');
            this.skip();
        }

        AddProfilesToList = require('../../src/appmixer/klaviyo/list/AddProfilesToList/AddProfilesToList');

        context = {
            auth: {
                apiKey: process.env.KLAVIYO_API_KEY
            },
            messages: {
                in: {
                    content: {}
                }
            },
            sendJson: function(data, port) {
                return { data, port };
            },
            httpRequest: require('./httpRequest.js'),
            CancelError: class extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'CancelError';
                }
            }
        };
    });

    it('should throw error when listId is missing', async () => {
        context.messages.in.content = {
            profileIds: ['profile1', 'profile2']
        };

        try {
            await AddProfilesToList.receive(context);
            assert.fail('Expected CancelError to be thrown');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'List ID is required!');
        }
    });

    it('should throw error when profileIds is missing', async () => {
        context.messages.in.content = {
            listId: 'test-list-id'
        };

        try {
            await AddProfilesToList.receive(context);
            assert.fail('Expected CancelError to be thrown');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'Profile IDs are required!');
        }
    });

    it('should parse JSON array string for profileIds', async () => {
        const mockHttpRequest = async (options) => {
            // Verify the request data structure
            assert.strictEqual(options.method, 'POST');
            assert(options.url.includes('test-list-id'));
            assert.strictEqual(options.data.data.length, 2);
            assert.strictEqual(options.data.data[0].type, 'profile');
            assert.strictEqual(options.data.data[0].id, 'profile1');
            assert.strictEqual(options.data.data[1].id, 'profile2');

            return { data: {} };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            listId: 'test-list-id',
            profileIds: '["profile1", "profile2"]'
        };

        const result = await AddProfilesToList.receive(context);
        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.port, 'out');
    });

    it('should parse comma-separated string for profileIds', async () => {
        const mockHttpRequest = async (options) => {
            // Verify the request data structure
            assert.strictEqual(options.data.data.length, 3);
            assert.strictEqual(options.data.data[0].id, 'profile1');
            assert.strictEqual(options.data.data[1].id, 'profile2');
            assert.strictEqual(options.data.data[2].id, 'profile3');

            return { data: {} };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            listId: 'test-list-id',
            profileIds: 'profile1, profile2, profile3'
        };

        const result = await AddProfilesToList.receive(context);
        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.port, 'out');
    });

    it('should handle array input for profileIds', async () => {
        const mockHttpRequest = async (options) => {
            // Verify the request data structure
            assert.strictEqual(options.data.data.length, 2);
            assert.strictEqual(options.data.data[0].id, 'profile1');
            assert.strictEqual(options.data.data[1].id, 'profile2');

            return { data: {} };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            listId: 'test-list-id',
            profileIds: ['profile1', 'profile2']
        };

        const result = await AddProfilesToList.receive(context);
        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.port, 'out');
    });

    it('should throw error for invalid profileIds type', async () => {
        context.messages.in.content = {
            listId: 'test-list-id',
            profileIds: 123
        };

        try {
            await AddProfilesToList.receive(context);
            assert.fail('Expected CancelError to be thrown');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'Profile IDs must be an array or comma-separated string!');
        }
    });

    it('should throw error for empty profileIds array', async () => {
        context.messages.in.content = {
            listId: 'test-list-id',
            profileIds: []
        };

        try {
            await AddProfilesToList.receive(context);
            assert.fail('Expected CancelError to be thrown');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'At least one profile ID is required!');
        }
    });

    it('should handle comma-separated string with empty values', async () => {
        const mockHttpRequest = async (options) => {
            // Should filter out empty strings and whitespace
            assert.strictEqual(options.data.data.length, 2);
            assert.strictEqual(options.data.data[0].id, 'profile1');
            assert.strictEqual(options.data.data[1].id, 'profile2');

            return { data: {} };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            listId: 'test-list-id',
            profileIds: 'profile1, , profile2, '
        };

        const result = await AddProfilesToList.receive(context);
        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.port, 'out');
    });

    it('should verify API request structure', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return { data: {} };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            listId: 'test-list-id',
            profileIds: ['profile1']
        };

        await AddProfilesToList.receive(context);

        // Verify all aspects of the HTTP request
        assert.strictEqual(capturedRequest.method, 'POST');
        assert.strictEqual(capturedRequest.url, 'https://a.klaviyo.com/api/lists/test-list-id/relationships/profiles');
        assert.strictEqual(capturedRequest.headers['Authorization'], `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`);
        assert.strictEqual(capturedRequest.headers['Accept'], 'application/vnd.api+json');
        assert.strictEqual(capturedRequest.headers['Content-Type'], 'application/vnd.api+json');
        assert.strictEqual(capturedRequest.headers['Revision'], '2025-07-15');
        assert.deepStrictEqual(capturedRequest.data, {
            data: [{
                type: 'profile',
                id: 'profile1'
            }]
        });
    });
});
