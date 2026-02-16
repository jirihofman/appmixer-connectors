const assert = require('assert');

describe('GetMonitor', () => {
    let component;

    before(() => {
        component = require('../../uptime/GetMonitor/GetMonitor');
    });

    it('should get a monitor by ID', async () => {
        const mockMonitor = {
            data: {
                id: 'mon_123',
                type: 'monitor',
                attributes: {
                    url: 'https://example.com',
                    pronounceable_name: 'Example Monitor',
                    status: 'up',
                    check_frequency: 60
                }
            }
        };

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
                assert.strictEqual(options.method, 'GET');
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/monitors/mon_123');
                assert(options.headers['Authorization'].includes('Bearer'));

                return { data: mockMonitor };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.id, 'mon_123');
                assert.strictEqual(data.url, 'https://example.com');
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
