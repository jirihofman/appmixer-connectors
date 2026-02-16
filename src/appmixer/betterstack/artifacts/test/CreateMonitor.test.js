const assert = require('assert');

describe('CreateMonitor', () => {
    let component;

    before(() => {
        component = require('../../uptime/CreateMonitor/CreateMonitor');
    });

    it('should create a monitor successfully', async () => {
        const mockMonitor = {
            data: {
                id: 'mon_123',
                type: 'monitor',
                attributes: {
                    url: 'https://example.com',
                    pronounceable_name: 'Example Monitor',
                    monitor_type: 'status',
                    status: 'pending',
                    check_frequency: 60,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                }
            }
        };

        const context = {
            messages: {
                in: {
                    content: {
                        url: 'https://example.com',
                        monitor_type: 'status',
                        pronounceable_name: 'Example Monitor',
                        check_frequency: 60,
                        email: true
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            CancelError: Error,
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'POST');
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/monitors');
                assert(options.headers['Authorization'].includes('Bearer'));
                assert.strictEqual(options.data.url, 'https://example.com');
                assert.strictEqual(options.data.monitor_type, 'status');

                return { data: mockMonitor };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.id, 'mon_123');
                assert.strictEqual(data.url, 'https://example.com');
                assert.strictEqual(data.pronounceable_name, 'Example Monitor');
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should throw error when URL is missing', async () => {
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
            assert(error.message.includes('URL is required'));
        }
    });
});
