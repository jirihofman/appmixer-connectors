const assert = require('assert');

describe('GetIncident', () => {
    let component;

    before(() => {
        component = require('../../uptime/GetIncident/GetIncident');
    });

    it('should get an incident by ID', async () => {
        const mockIncident = {
            data: {
                id: 'inc_123',
                type: 'incident',
                attributes: {
                    name: 'Example Incident',
                    cause: 'timeout',
                    started_at: '2024-01-01T00:00:00Z',
                    resolved_at: null
                }
            }
        };

        const context = {
            messages: {
                in: {
                    content: {
                        incidentId: 'inc_123'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            CancelError: Error,
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'GET');
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/incidents/inc_123');
                assert(options.headers['Authorization'].includes('Bearer'));

                return { data: mockIncident };
            },
            sendJson: (data, port) => {
                assert.strictEqual(port, 'out');
                assert.strictEqual(data.id, 'inc_123');
                assert.strictEqual(data.name, 'Example Incident');
                return Promise.resolve();
            }
        };

        await component.receive(context);
    });

    it('should throw error when Incident ID is missing', async () => {
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
            assert(error.message.includes('Incident ID is required'));
        }
    });
});
