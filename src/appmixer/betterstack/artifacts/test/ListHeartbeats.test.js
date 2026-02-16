const assert = require('assert');

describe('ListHeartbeats', () => {
    let component;

    before(() => {
        component = require('../../uptime/ListHeartbeats/ListHeartbeats');
    });

    it('should list heartbeats and return array output', async () => {
        const mockHeartbeats = {
            data: [
                {
                    id: 'hb_1',
                    type: 'heartbeat',
                    attributes: {
                        pinged_at: '2024-01-01T00:00:00Z',
                        status: 'success'
                    }
                },
                {
                    id: 'hb_2',
                    type: 'heartbeat',
                    attributes: {
                        pinged_at: '2024-01-02T00:00:00Z',
                        status: 'success'
                    }
                }
            ]
        };

        const context = {
            properties: {},
            messages: {
                in: {
                    content: {
                        monitorId: 'mon_123',
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
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/heartbeats');
                assert(options.headers['Authorization'].includes('Bearer'));
                assert.strictEqual(options.params.monitor_id, 'mon_123');

                return { data: mockHeartbeats };
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

    it('should throw error when Monitor ID is missing', async () => {
        const context = {
            properties: {},
            messages: {
                in: {
                    content: {
                        outputType: 'array'
                    }
                }
            },
            CancelError: Error
        };

        try {
            await component.receive(context);
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert(error.message.includes('Monitor ID is required'));
        }
    });
});
