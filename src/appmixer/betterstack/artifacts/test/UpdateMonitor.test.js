const assert = require('assert');

describe('UpdateMonitor', () => {
    let component;

    before(() => {
        component = require('../../uptime/UpdateMonitor/UpdateMonitor');
    });

    it('should update a monitor', async () => {
        const context = {
            messages: {
                in: {
                    content: {
                        monitorId: 'mon_123',
                        pronounceable_name: 'Updated Monitor',
                        check_frequency: 120,
                        paused: true
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            CancelError: Error,
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'PATCH');
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/monitors/mon_123');
                assert(options.headers['Authorization'].includes('Bearer'));
                assert.strictEqual(options.data.pronounceable_name, 'Updated Monitor');
                assert.strictEqual(options.data.check_frequency, 120);
                assert.strictEqual(options.data.paused, true);

                return { data: {} };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.deepStrictEqual(data, {});
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
