const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

describe('FindLists', () => {

    let FindLists;
    let context;

    before(function() {
        // Skip all tests if the access token is not set
        if (!process.env.KLAVIYO_API_KEY) {
            console.log('Skipping tests - KLAVIYO_API_KEY not set');
            this.skip();
        }

        FindLists = require('../../src/appmixer/klaviyo/list/FindLists/FindLists');

        context = {
            auth: {
                apiKey: process.env.KLAVIYO_API_KEY
            },
            messages: {
                in: {
                    content: {}
                }
            },
            properties: {},
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

    it('should generate output port options when requested', async () => {
        context.properties.generateOutputPortOptions = true;
        context.messages.in.content = { outputType: 'array' };

        // Mock the lib.getOutputPortOptions function
        const originalLib = require('../../src/appmixer/klaviyo/lib.generated');
        const mockLib = {
            getOutputPortOptions: (ctx, outputType, schema, options) => {
                return { ports: 'mocked', outputType, label: options.label };
            }
        };

        // Replace the require temporarily
        require.cache[require.resolve('../../src/appmixer/klaviyo/lib.generated')] = {
            exports: mockLib
        };

        const result = await FindLists.receive(context);

        assert.deepStrictEqual(result, { ports: 'mocked', outputType: 'array', label: 'Lists' });

        // Restore the original module
        require.cache[require.resolve('../../src/appmixer/klaviyo/lib.generated')] = {
            exports: originalLib
        };
    });

    it('should make correct API request with query parameters', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: [
                        {
                            id: 'list1',
                            type: 'list',
                            attributes: { name: 'List 1' }
                        }
                    ]
                }
            };
        };

        // Mock the lib.sendArrayOutput function
        let sendArrayOutputCalled = false;
        const originalLib = require('../../src/appmixer/klaviyo/lib.generated');
        const mockLib = {
            sendArrayOutput: ({ context, records, outputType }) => {
                sendArrayOutputCalled = true;
                assert.strictEqual(records.length, 1);
                assert.strictEqual(records[0].id, 'list1');
                assert.strictEqual(outputType, 'object');
                return context.sendJson({ result: records }, 'out');
            }
        };

        require.cache[require.resolve('../../src/appmixer/klaviyo/lib.generated')] = {
            exports: mockLib
        };

        context.httpRequest = mockHttpRequest;
        context.properties = {};
        context.messages.in.content = {
            filter: 'equals(name,"Test List")',
            sort: 'name',
            outputType: 'object'
        };

        const result = await FindLists.receive(context);

        // Verify API request
        assert.strictEqual(capturedRequest.method, 'GET');
        assert.strictEqual(capturedRequest.url, 'https://a.klaviyo.com/api/lists');
        assert.strictEqual(capturedRequest.headers['Authorization'], `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`);
        assert.strictEqual(capturedRequest.headers['Accept'], 'application/vnd.api+json');
        assert.strictEqual(capturedRequest.headers['Revision'], '2025-07-15');

        // Verify query params
        assert.strictEqual(capturedRequest.params.filter, 'equals(name,"Test List")');
        assert.strictEqual(capturedRequest.params.include, 'flow-triggers,tags');
        assert.strictEqual(capturedRequest.params.sort, 'name');

        assert(sendArrayOutputCalled, 'lib.sendArrayOutput should have been called');
        assert(result, 'Result should be returned');

        // Restore the original module
        require.cache[require.resolve('../../src/appmixer/klaviyo/lib.generated')] = {
            exports: originalLib
        };
    });

    it('should return notFound when no lists are found', async () => {
        const mockHttpRequest = async (options) => {
            return {
                data: {
                    data: [] // Empty array
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.properties = {};
        context.messages.in.content = { outputType: 'array' };

        const result = await FindLists.receive(context);

        assert.strictEqual(result.port, 'notFound');
        assert.deepStrictEqual(result.data, {});
    });

    it('should handle source mode correctly', async () => {
        const mockHttpRequest = async (options) => {
            return {
                data: {
                    data: [
                        {
                            id: 'list1',
                            type: 'list',
                            attributes: { name: 'Source List' }
                        }
                    ]
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.properties = { isSource: true };
        context.messages.in.content = { outputType: 'array' };

        const result = await FindLists.receive(context);

        assert.strictEqual(result.port, 'out');
        assert.strictEqual(result.data.result.length, 1);
        assert.strictEqual(result.data.result[0].id, 'list1');
        assert.strictEqual(result.data.result[0].attributes.name, 'Source List');
    });

    it('should test toSelectArray transformation', () => {
        const testData = {
            result: [
                {
                    id: 'list1',
                    attributes: { name: 'First List' }
                },
                {
                    id: 'list2',
                    attributes: { name: 'Second List' }
                }
            ]
        };

        const result = FindLists.toSelectArray(testData);

        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result[0], { label: 'First List', value: 'list1' });
        assert.deepStrictEqual(result[1], { label: 'Second List', value: 'list2' });
    });

    it('should handle request without optional parameters', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: [
                        {
                            id: 'list1',
                            type: 'list',
                            attributes: { name: 'Simple List' }
                        }
                    ]
                }
            };
        };

        // Mock the lib.sendArrayOutput function
        const originalLib = require('../../src/appmixer/klaviyo/lib.generated');
        const mockLib = {
            sendArrayOutput: ({ context, records, outputType }) => {
                return context.sendJson({ result: records }, 'out');
            }
        };

        require.cache[require.resolve('../../src/appmixer/klaviyo/lib.generated')] = {
            exports: mockLib
        };

        context.httpRequest = mockHttpRequest;
        context.properties = {};
        context.messages.in.content = {
            outputType: 'array'
            // No filter or sort specified
        };

        await FindLists.receive(context);

        // Verify that undefined params are still passed (letting API handle defaults)
        assert.strictEqual(capturedRequest.params.filter, undefined);
        assert.strictEqual(capturedRequest.params.include, 'flow-triggers,tags');
        assert.strictEqual(capturedRequest.params.sort, undefined);

        // Restore the original module
        require.cache[require.resolve('../../src/appmixer/klaviyo/lib.generated')] = {
            exports: originalLib
        };
    });
});
