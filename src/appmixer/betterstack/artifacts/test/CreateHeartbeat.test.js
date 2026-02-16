const assert = require('assert');

describe('CreateHeartbeat', () => {
    let component;

    before(() => {
        component = require('../../uptime/CreateHeartbeat/CreateHeartbeat');
    });

    it('should create a heartbeat successfully', async () => {
        const context = {
            messages: {
                in: {
                    content: {
                        monitorId: 'mon_123'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            CancelError: Error,
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'POST');
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/heartbeats/mon_123');
                assert(options.headers['Authorization'].includes('Bearer'));

                return { data: {} };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.status, 'success');
                assert.strictEqual(data.message, 'Heartbeat sent successfully');
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should throw error when Monitor ID is missing', async () => {
        const context = {
            messages: {
                in: {
                    content: {}
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
