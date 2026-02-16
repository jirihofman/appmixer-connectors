const assert = require('assert');

describe('UpdateIncident', () => {
    let component;

    before(() => {
        component = require('../../uptime/UpdateIncident/UpdateIncident');
    });

    it('should update an incident', async () => {
        const context = {
            messages: {
                in: {
                    content: {
                        incidentId: 'inc_123',
                        requester_email: 'user@example.com'
                    }
                }
            },
            auth: {
                apiToken: 'mock_token'
            },
            CancelError: Error,
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'PATCH');
                assert.strictEqual(options.url, 'https://uptime.betterstack.com/api/v2/incidents/inc_123');
                assert(options.headers['Authorization'].includes('Bearer'));
                assert.strictEqual(options.data.requester_email, 'user@example.com');

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
