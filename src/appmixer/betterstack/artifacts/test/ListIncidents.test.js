const assert = require('assert');

describe('ListIncidents', () => {
    let component;

    before(() => {
        component = require('../../uptime/ListIncidents/ListIncidents');
    });

    it('should list incidents and return array output', async () => {
        const mockIncidents = {
            data: [
                {
                    id: 'inc_1',
                    type: 'incident',
                    attributes: {
                        name: 'Incident 1',
                        cause: 'timeout',
                        started_at: '2024-01-01T00:00:00Z'
                    }
                },
                {
                    id: 'inc_2',
                    type: 'incident',
                    attributes: {
                        name: 'Incident 2',
                        cause: 'dns_error',
                        started_at: '2024-01-02T00:00:00Z'
                    }
                }
            ]
        };

        const context = {
            properties: {},
            messages: {
                in: {
                    content: {
                        outputType: 'array'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            CancelError: Error,
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'GET');
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/incidents');
                assert(options.headers['Authorization'].includes('Bearer'));

                return { data: mockIncidents };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert(data.result);
                assert(Array.isArray(data.result));
                assert.strictEqual(data.count, 2);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });
});
