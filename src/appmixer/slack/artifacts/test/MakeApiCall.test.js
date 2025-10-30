const assert = require('assert');
const testUtils = require('../../../../../test/utils.js');

const MakeApiCall = require('../../list/MakeApiCall/MakeApiCall.js');

describe('MakeApiCall component', () => {

    let context;

    beforeEach(() => {
        context = testUtils.createMockContext();
    });

    it('makes a GET request to Slack API', async () => {
        context.messages = {
            in: {
                content: {
                    url: 'https://slack.com/api/users.list',
                    method: 'GET'
                }
            }
        };

        const mockResponse = {
            status: 200,
            headers: { 'content-type': 'application/json' },
            data: { ok: true, members: [] }
        };

        context.httpRequest.resolves(mockResponse);

        await MakeApiCall.receive(context);

        assert.equal(context.httpRequest.callCount, 1);
        const requestOptions = context.httpRequest.getCall(0).args[0];
        assert.strictEqual(requestOptions.method, 'GET');
        assert.strictEqual(requestOptions.url, 'https://slack.com/api/users.list');
        assert.strictEqual(requestOptions.headers['Content-Type'], 'application/json');
        assert(requestOptions.headers['Authorization'].includes('Bearer'));

        assert.equal(context.sendJson.callCount, 1);
        const output = context.sendJson.getCall(0).args[0];
        assert.strictEqual(output.status, 200);
        assert.deepStrictEqual(output.body, { ok: true, members: [] });
    });

    it('makes a POST request with body to Slack API', async () => {
        context.messages = {
            in: {
                content: {
                    url: 'https://slack.com/api/chat.postMessage',
                    method: 'POST',
                    body: '{"channel":"C123","text":"Hello"}'
                }
            }
        };

        const mockResponse = {
            status: 200,
            headers: { 'content-type': 'application/json' },
            data: { ok: true, ts: '1234567890.123456' }
        };

        context.httpRequest.resolves(mockResponse);

        await MakeApiCall.receive(context);

        assert.equal(context.httpRequest.callCount, 1);
        const requestOptions = context.httpRequest.getCall(0).args[0];
        assert.strictEqual(requestOptions.method, 'POST');
        assert.deepStrictEqual(requestOptions.data, { channel: 'C123', text: 'Hello' });

        assert.equal(context.sendJson.callCount, 1);
        const output = context.sendJson.getCall(0).args[0];
        assert.strictEqual(output.status, 200);
    });

    it('handles API errors correctly', async () => {
        context.messages = {
            in: {
                content: {
                    url: 'https://slack.com/api/invalid.endpoint',
                    method: 'GET'
                }
            }
        };

        const error = new Error('Request failed with status code 404');
        error.response = {
            data: { ok: false, error: 'not_found' }
        };

        context.httpRequest.rejects(error);

        try {
            await MakeApiCall.receive(context);
            assert.fail('Should have thrown an error');
        } catch (err) {
            assert(err.message.includes('not_found'));
        }
    });
});
