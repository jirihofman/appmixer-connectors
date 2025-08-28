const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

describe('CreateProfile', () => {

    let CreateProfile;
    let context;

    before(function() {
        // Skip all tests if the access token is not set
        if (!process.env.KLAVIYO_API_KEY) {
            console.log('Skipping tests - KLAVIYO_API_KEY not set');
            this.skip();
        }

        CreateProfile = require('../../src/appmixer/klaviyo/profile/CreateProfile/CreateProfile');

        context = {
            auth: {
                apiKey: process.env.KLAVIYO_API_KEY
            },
            messages: {
                in: {
                    content: {}
                }
            },
            sendJson: function(data, port) {
                return { data, port };
            },
            httpRequest: require('./httpRequest.js'),
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
        assert.strictEqual(capturedRequest.headers['Authorization'], `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`);
        assert.strictEqual(capturedRequest.data.data.type, 'profile');
        assert.strictEqual(capturedRequest.data.data.attributes.email, 'test@example.com');

        // Verify response
        assert.strictEqual(result.port, 'out');
        assert.strictEqual(result.data.id, 'profile123');
    });

    it('should create profile with phone number only', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile456',
                        type: 'profile',
                        attributes: { phone_number: '+1234567890' }
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            phoneNumber: '+1234567890'
        };

        const result = await CreateProfile.receive(context);

        assert.strictEqual(capturedRequest.data.data.attributes.phone_number, '+1234567890');
        assert.strictEqual(result.data.id, 'profile456');
    });

    it('should create profile with external ID only', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile789',
                        type: 'profile',
                        attributes: { external_id: 'ext123' }
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            externalId: 'ext123'
        };

        const result = await CreateProfile.receive(context);

        assert.strictEqual(capturedRequest.data.data.attributes.external_id, 'ext123');
        assert.strictEqual(result.data.id, 'profile789');
    });

    it('should create profile with complete data including location', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-complete',
                        type: 'profile',
                        attributes: {
                            email: 'john.doe@example.com',
                            first_name: 'John',
                            last_name: 'Doe'
                        }
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

        const result = await CreateProfile.receive(context);

        // Verify all attributes are properly mapped
        const attributes = capturedRequest.data.data.attributes;
        assert.strictEqual(attributes.email, 'john.doe@example.com');
        assert.strictEqual(attributes.first_name, 'John');
        assert.strictEqual(attributes.last_name, 'Doe');
        assert.strictEqual(attributes.organization, 'Acme Corp');
        assert.strictEqual(attributes.title, 'Developer');
        assert.strictEqual(attributes.image, 'https://example.com/photo.jpg');

        // Verify location object
        const location = attributes.location;
        assert.strictEqual(location.address1, '123 Main St');
        assert.strictEqual(location.address2, 'Apt 4B');
        assert.strictEqual(location.city, 'New York');
        assert.strictEqual(location.country, 'USA');
        assert.strictEqual(location.latitude, 40.7128);
        assert.strictEqual(location.longitude, -74.0060);
        assert.strictEqual(location.region, 'NY');
        assert.strictEqual(location.zip, '10001');
        assert.strictEqual(location.timezone, 'America/New_York');
        assert.strictEqual(location.ip, '192.168.1.1');

        assert.strictEqual(result.data.id, 'profile-complete');
    });

    it('should handle numeric coordinates properly', async () => {
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

    it('should handle string coordinates by parsing them', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-string-coords',
                        type: 'profile'
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            email: 'stringcoords@example.com',
            latitude: '40.7128',
            longitude: '-74.0060'
        };

        await CreateProfile.receive(context);

        const location = capturedRequest.data.data.attributes.location;
        assert.strictEqual(location.latitude, 40.7128);
        assert.strictEqual(location.longitude, -74.0060);
    });

    it('should exclude undefined location fields', async () => {
        let capturedRequest = null;
        const mockHttpRequest = async (options) => {
            capturedRequest = options;
            return {
                data: {
                    data: {
                        id: 'profile-partial',
                        type: 'profile'
                    }
                }
            };
        };

        context.httpRequest = mockHttpRequest;
        context.messages.in.content = {
            email: 'partial@example.com',
            city: 'New York'
            // Other location fields are undefined
        };

        await CreateProfile.receive(context);

        const location = capturedRequest.data.data.attributes.location;
        assert.strictEqual(location.city, 'New York');
        assert.strictEqual(location.latitude, undefined);
        assert.strictEqual(location.longitude, undefined);
        assert.strictEqual(location.address1, undefined);
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
        assert.strictEqual(headers['Authorization'], `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`);
        assert.strictEqual(headers['Accept'], 'application/vnd.api+json');
        assert.strictEqual(headers['Content-Type'], 'application/vnd.api+json');
        assert.strictEqual(headers['Revision'], '2025-07-15');
    });
});
