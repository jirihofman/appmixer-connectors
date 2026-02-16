const assert = require('assert');

describe('ListMonitors', () => {
    let component;

    before(() => {
        component = require('../../uptime/ListMonitors/ListMonitors');
    });

    it('should list monitors and return array output', async () => {
        const mockMonitors = {
            data: [
                {
                    id: 'mon_1',
                    type: 'monitor',
                    attributes: {
                        url: 'https://example1.com',
                        pronounceable_name: 'Monitor 1',
                        status: 'up',
                        check_frequency: 60
                    }
                },
                {
                    id: 'mon_2',
                    type: 'monitor',
                    attributes: {
                        url: 'https://example2.com',
                        pronounceable_name: 'Monitor 2',
                        status: 'down',
                        check_frequency: 120
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
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/monitors');
                assert(options.headers['Authorization'].includes('Bearer'));
                assert.strictEqual(options.params.per_page, 100);

                return { data: mockMonitors };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert(data.result);
                assert(Array.isArray(data.result));
                assert.strictEqual(data.count, 2);
                assert.strictEqual(data.result.length, 2);
                assert.strictEqual(data.result[0].id, 'mon_1');
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should generate output port options', async () => {
        const context = {
            properties: {
                generateOutputPortOptions: true
            },
            messages: {
                in: {
                    content: {
                        outputType: 'array'
                    }
                }
            },
            CancelError: Error,
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert(Array.isArray(data));
                assert(data.length > 0);
                assert(data[0].label);
                assert(data[0].value);
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });
});
