const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');
const sinon = require('sinon');
const { rateLimitDelay } = require('./testUtils');

describe('SendEmail Component', function() {
    let context;
    let SendEmail;

    this.timeout(30000);

    // Add delay between tests to respect rate limiting (2 requests per second)
    beforeEach(async function() {
        await rateLimitDelay();
    });

    before(function() {
        // Skip all tests if the API key is not set
        if (!process.env.SENDGRID_API_KEY) {
            console.log('Skipping tests - SENDGRID_API_KEY not set');
            this.skip();
        }

        // Load the component
        SendEmail = require(path.join(__dirname, '../../src/appmixer/sendgrid/core/SendEmail/SendEmail.js'));

        // Mock context
        context = {
            auth: {
                apiKey: process.env.SENDGRID_API_KEY
            },
            messages: {
                in: {
                    content: {
                        from: 'test@example.com',
                        to: ['test@appmixer.com'],
                        subject: 'Test Email from Appmixer SendGrid Connector',
                        html: '<h1>Hello from Appmixer!</h1><p>This is a test email sent through the SendGrid API.</p>',
                        text: 'Hello from Appmixer! This is a test email sent through the SendGrid API.'
                    }
                }
            },
            httpRequest: require('./httpRequest.js'),
            sendJson: (data, outputPort) => {
                return { data, outputPort };
            },
            CancelError: class CancelError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'CancelError';
                }
            }
        };

        // Mock the receive method to validate required fields
        const originalReceive = SendEmail.receive;
        SendEmail.receive = async function(context) {
            context.CancelError = class CancelError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'CancelError';
                }
            };
            return originalReceive(context);
        };
    });

    it('should send an email successfully', async () => {
        // Use the context from before() and override only what is needed
        const testContext = { ...context, sendJson: sinon.stub() };
        testContext.messages = {
            in: {
                content: {
                    from: 'test@example.com',
                    to: ['test@appmixer.com'],
                    subject: 'Test Subject',
                    html: '<h1>Hello from Appmixer!</h1><p>This is a test email sent through the SendGrid API.</p>'
                }
            }
        };

        await SendEmail.receive(testContext);

        sinon.assert.calledOnce(testContext.sendJson);
    });

    it('should fail without required from field', async function() {
        const testContext = { ...context };
        testContext.messages = {
            in: {
                content: { to: 'test@example.com', subject: 'Test' }
            }
        };

        try {
            await SendEmail.receive(testContext);
            assert.fail('Expected error for missing from field');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'From email is required!');
        }
    });

    it('should fail without required to field', async function() {
        const testContext = { ...context };
        testContext.messages = {
            in: {
                content: { from: 'test@example.com', subject: 'Test' }
            }
        };

        try {
            await SendEmail.receive(testContext);
            assert.fail('Expected error for missing to field');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'To email is required!');
        }
    });

    it('should fail without required subject field', async function() {
        const testContext = { ...context };
        testContext.messages = {
            in: {
                content: { from: 'test@example.com', to: 'test@example.com' }
            }
        };

        try {
            await SendEmail.receive(testContext);
            assert.fail('Expected error for missing subject field');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'Subject is required!');
        }
    });

    it('should fail without html or text content', async function() {
        const testContext = { ...context };
        testContext.messages = {
            in: {
                content: {
                    from: 'test@example.com',
                    to: 'test@example.com',
                    subject: 'Test'
                }
            }
        };

        try {
            await SendEmail.receive(testContext);
            assert.fail('Expected error for missing content');
        } catch (error) {
            assert.strictEqual(error.name, 'CancelError');
            assert.strictEqual(error.message, 'Either HTML or text content is required!');
        }
    });
});
