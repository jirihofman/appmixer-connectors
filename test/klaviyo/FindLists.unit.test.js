const assert = require('assert');

describe('FindLists - Unit Tests (No API)', () => {

    let FindLists;

    before(() => {
        FindLists = require('../../src/appmixer/klaviyo/list/FindLists/FindLists');
    });

    describe('toSelectArray', () => {
        it('should transform lists to select array format', () => {
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

        it('should handle empty result array', () => {
            const testData = { result: [] };
            const result = FindLists.toSelectArray(testData);
            assert.strictEqual(result.length, 0);
        });

        it('should handle lists with special characters in names', () => {
            const testData = {
                result: [
                    {
                        id: 'list-special',
                        attributes: { name: 'List with "quotes" & symbols' }
                    }
                ]
            };

            const result = FindLists.toSelectArray(testData);
            assert.strictEqual(result.length, 1);
            assert.deepStrictEqual(result[0], {
                label: 'List with "quotes" & symbols',
                value: 'list-special'
            });
        });
    });

    describe('Component Logic Tests', () => {
        let context;

        beforeEach(() => {
            context = {
                auth: {
                    apiKey: 'test-api-key'
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
                httpRequest: async () => ({
                    data: {
                        data: []
                    }
                }),
                CancelError: class extends Error {
                    constructor(message) {
                        super(message);
                        this.name = 'CancelError';
                    }
                }
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

        it('should build query parameters correctly', async () => {
            let capturedRequest = null;
            const mockHttpRequest = async (options) => {
                capturedRequest = options;
                return {
                    data: {
                        data: [
                            {
                                id: 'list1',
                                type: 'list',
                                attributes: { name: 'Test List' }
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
                filter: 'equals(name,"Test List")',
                sort: 'name',
                outputType: 'object'
            };

            await FindLists.receive(context);

            // Verify API request parameters
            assert.strictEqual(capturedRequest.method, 'GET');
            assert.strictEqual(capturedRequest.url, 'https://a.klaviyo.com/api/lists');
            assert.strictEqual(capturedRequest.headers['Authorization'], 'Klaviyo-API-Key test-api-key');
            assert.strictEqual(capturedRequest.headers['Accept'], 'application/vnd.api+json');
            assert.strictEqual(capturedRequest.headers['Revision'], '2025-07-15');

            // Verify query params
            assert.strictEqual(capturedRequest.params.filter, 'equals(name,"Test List")');
            assert.strictEqual(capturedRequest.params.include, 'flow-triggers,tags');
            assert.strictEqual(capturedRequest.params.sort, 'name');

            // Restore the original module
            require.cache[require.resolve('../../src/appmixer/klaviyo/lib.generated')] = {
                exports: originalLib
            };
        });
    });
});
