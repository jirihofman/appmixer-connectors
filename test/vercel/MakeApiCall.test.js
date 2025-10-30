const assert = require('assert');

describe('MakeApiCall', () => {
    let component;

    before(() => {
        component = require('../../src/appmixer/vercel/core/MakeApiCall/MakeApiCall');
    });

    it('should make a GET request', async () => {
        const testUrl = 'https://api.vercel.com/v9/projects';
        const mockResponse = {
            projects: [
                { id: 'prj_1', name: 'Project 1' },
                { id: 'prj_2', name: 'Project 2' }
            ]
        };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'GET'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'GET');
                assert.strictEqual(options.url, testUrl);
                assert.strictEqual(options.headers['Authorization'], 'Bearer mock_token');
                assert.strictEqual(options.data, undefined);

                return {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                    data: mockResponse
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 200);
                assert.deepStrictEqual(data.body, mockResponse);
                assert.deepStrictEqual(data.headers, { 'content-type': 'application/json' });
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should make a POST request with body', async () => {
        const testUrl = 'https://api.vercel.com/v9/projects';
        const requestBody = { name: 'New Project', framework: 'nextjs' };
        const mockResponse = {
            id: 'prj_new',
            name: 'New Project',
            framework: 'nextjs'
        };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'POST',
                        body: JSON.stringify(requestBody)
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'POST');
                assert.strictEqual(options.url, testUrl);
                assert.strictEqual(options.headers['Authorization'], 'Bearer mock_token');
                assert.deepStrictEqual(options.data, requestBody);

                return {
                    status: 201,
                    headers: { 'content-type': 'application/json' },
                    data: mockResponse
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 201);
                assert.deepStrictEqual(data.body, mockResponse);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should make a PATCH request', async () => {
        const testUrl = 'https://api.vercel.com/v9/projects/prj_123';
        const updateData = { name: 'Updated Project' };
        const mockResponse = {
            id: 'prj_123',
            name: 'Updated Project'
        };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'PATCH',
                        body: JSON.stringify(updateData)
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'PATCH');
                assert.strictEqual(options.url, testUrl);
                assert.deepStrictEqual(options.data, updateData);

                return {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                    data: mockResponse
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 200);
                assert.deepStrictEqual(data.body, mockResponse);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should make a DELETE request', async () => {
        const testUrl = 'https://api.vercel.com/v13/deployments/dpl_xyz';
        const mockResponse = { state: 'DELETED' };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'DELETE'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'DELETE');
                assert.strictEqual(options.url, testUrl);
                assert.strictEqual(options.data, undefined);

                return {
                    status: 200,
                    headers: {},
                    data: mockResponse
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 200);
                assert.deepStrictEqual(data.body, mockResponse);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should make a PUT request with body', async () => {
        const testUrl = 'https://api.vercel.com/v1/integrations/configuration/icfg_123';
        const configData = { settings: { enabled: true } };
        const mockResponse = { id: 'icfg_123', ...configData };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'PUT',
                        body: JSON.stringify(configData)
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'PUT');
                assert.strictEqual(options.url, testUrl);
                assert.deepStrictEqual(options.data, configData);

                return {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                    data: mockResponse
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 200);
                assert.deepStrictEqual(data.body, mockResponse);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should handle URLs with query parameters', async () => {
        const testUrl = 'https://api.vercel.com/v9/projects?teamId=team_123&limit=10';
        const mockResponse = { projects: [], pagination: {} };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'GET'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'GET');
                assert.strictEqual(options.url, testUrl);

                return {
                    status: 200,
                    headers: {},
                    data: mockResponse
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 200);
                assert.deepStrictEqual(data.body, mockResponse);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should handle request without body parameter', async () => {
        const testUrl = 'https://api.vercel.com/v2/user';
        const mockResponse = { user: { email: 'test@example.com' } };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'GET'
                        // No body parameter
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'GET');
                assert.strictEqual(options.url, testUrl);
                assert.strictEqual(options.data, undefined);

                return {
                    status: 200,
                    headers: {},
                    data: mockResponse
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 200);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should include response headers in output', async () => {
        const testUrl = 'https://api.vercel.com/v9/projects';
        const mockHeaders = {
            'content-type': 'application/json',
            'x-vercel-id': 'iad1::12345',
            'x-ratelimit-limit': '100',
            'x-ratelimit-remaining': '99'
        };

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'GET'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            httpRequest: async (options) => {
                return {
                    status: 200,
                    headers: mockHeaders,
                    data: { projects: [] }
                };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 200);
                assert.deepStrictEqual(data.headers, mockHeaders);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should throw error for invalid JSON in body', async () => {
        const testUrl = 'https://api.vercel.com/v9/projects';
        const invalidJson = '{ invalid json here }';

        const context = {
            messages: {
                in: {
                    content: {
                        url: testUrl,
                        method: 'POST',
                        body: invalidJson
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            }
        };

        try {
            await component.receive(context);
            assert.fail('Expected error for invalid JSON');
        } catch (error) {
            assert(error.message.includes('Invalid JSON in request body'));
        }
    });
});
