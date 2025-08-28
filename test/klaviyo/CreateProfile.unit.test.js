const assert = require('assert');

describe('CreateProfile - Unit Tests (No API)', () => {

    let CreateProfile;
    let context;

    before(() => {
        CreateProfile = require('../../src/appmixer/klaviyo/profile/CreateProfile/CreateProfile');

        context = {
            auth: {
                apiKey: 'test-api-key'
            },
            messages: {
                in: {
                    content: {}
                }
            },
            sendJson: function(data, port) {
                return { data, port };
            },
            httpRequest: async () => ({
                data: {
                    data: {
                        id: 'test-profile-id',
                        type: 'profile'
                    }
                }
            }),
            CancelError: class extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'CancelError';
                }
            }
        };
    });

    it('should throw error when no identifier is provided', async () => {
        context.messages.in.content = {
            firstName: 'John',
            lastName: 'Doe'
        };

        try {
            await CreateProfile.receive(context);
            assert.fail('Expected CancelError to be thrown');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'Email or Phone Number or External ID is required!');
        }
    });

    it('should create profile with email only', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile123',
                        type: 'profile',
                        attributes: { email: 'test@example.com' }
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            email: 'test@example.com'
        };

        const result = await CreateProfile.receive(context);

        // Verify request structure
        assert.strictEqual(capturedRequest.method, 'POST');
        assert.strictEqual(capturedRequest.url, 'https://a.klaviyo.com/api/profiles');
        assert.strictEqual(capturedRequest.headers['Authorization'], 'Klaviyo-API-Key test-api-key');
        assert.strictEqual(capturedRequest.data.data.type, 'profile');
        assert.strictEqual(capturedRequest.data.data.attributes.email, 'test@example.com');

        // Verify response
        assert.strictEqual(result.port, 'out');
        assert.strictEqual(result.data.id, 'profile123');
    });

    it('should handle complete location data with coordinate parsing', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-complete',
                        type: 'profile'
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            organization: 'Acme Corp',
            title: 'Developer',
            image: 'https://example.com/photo.jpg',
            address1: '123 Main St',
            address2: 'Apt 4B',
            city: 'New York',
            country: 'USA',
            latitude: '40.7128',
            longitude: '-74.0060',
            region: 'NY',
            zip: '10001',
            timezone: 'America/New_York',
            ip: '192.168.1.1'
        };

        await CreateProfile.receive(context);

        // Verify all attributes are properly mapped
        const attributes = capturedRequest.data.data.attributes;
        assert.strictEqual(attributes.email, 'john.doe@example.com');
        assert.strictEqual(attributes.first_name, 'John');
        assert.strictEqual(attributes.last_name, 'Doe');
        assert.strictEqual(attributes.organization, 'Acme Corp');
        assert.strictEqual(attributes.title, 'Developer');
        assert.strictEqual(attributes.image, 'https://example.com/photo.jpg');

        // Verify location object and coordinate parsing
        const location = attributes.location;
        assert.strictEqual(location.address1, '123 Main St');
        assert.strictEqual(location.address2, 'Apt 4B');
        assert.strictEqual(location.city, 'New York');
        assert.strictEqual(location.country, 'USA');
        assert.strictEqual(location.latitude, 40.7128);  // Should be parsed as float
        assert.strictEqual(location.longitude, -74.0060); // Should be parsed as float
        assert.strictEqual(location.region, 'NY');
        assert.strictEqual(location.zip, '10001');
        assert.strictEqual(location.timezone, 'America/New_York');
        assert.strictEqual(location.ip, '192.168.1.1');
    });

    it('should handle numeric coordinates without parsing', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-coords',
                        type: 'profile'
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            email: 'coords@example.com',
            latitude: 40.7128,
            longitude: -74.0060
        };

        await CreateProfile.receive(context);

        const location = capturedRequest.data.data.attributes.location;
        assert.strictEqual(location.latitude, 40.7128);
        assert.strictEqual(location.longitude, -74.0060);
    });

    it('should verify all required headers are set', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-headers',
                        type: 'profile'
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            email: 'headers@example.com'
        };

        await CreateProfile.receive(context);

        const headers = capturedRequest.headers;
        assert.strictEqual(headers['Authorization'], 'Klaviyo-API-Key test-api-key');
        assert.strictEqual(headers['Accept'], 'application/vnd.api+json');
        assert.strictEqual(headers['Content-Type'], 'application/vnd.api+json');
        assert.strictEqual(headers['Revision'], '2025-07-15');

        // Verify additional fields parameter
        assert.strictEqual(capturedRequest.params['additional-fields[profile]'], 'subscriptions,predictive_analytics');
    });

    it('should accept phone number as primary identifier', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-phone',
                        type: 'profile'
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            phoneNumber: '+1234567890'
        };

        await CreateProfile.receive(context);

        assert.strictEqual(capturedRequest.data.data.attributes.phone_number, '+1234567890');
        assert.strictEqual(capturedRequest.data.data.attributes.email, undefined);
    });

    it('should accept external ID as primary identifier', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-external',
                        type: 'profile'
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            externalId: 'ext123'
        };

        await CreateProfile.receive(context);

        assert.strictEqual(capturedRequest.data.data.attributes.external_id, 'ext123');
        assert.strictEqual(capturedRequest.data.data.attributes.email, undefined);
    });
});
