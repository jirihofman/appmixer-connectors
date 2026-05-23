'use strict';

const assert = require('assert');
const lib = require('../../lib');

describe('clockify lib', () => {

    it('compacts empty values and keeps false values', () => {
        assert.deepStrictEqual(lib.compact({
            name: 'Acme',
            empty: '',
            missing: undefined,
            none: null,
            archived: false
        }), {
            name: 'Acme',
            archived: false
        });
    });

    it('parses comma-separated lists', () => {
        assert.deepStrictEqual(lib.parseList('a, b,,c'), ['a', 'b', 'c']);
        assert.deepStrictEqual(lib.parseList(['a', '', 'b']), ['a', 'b']);
        assert.strictEqual(lib.parseList(undefined), undefined);
    });

    it('sends authenticated requests to the configured API base URL', async () => {
        const context = {
            auth: {
                apiKey: 'secret',
                apiBaseUrl: 'https://euc1.clockify.me/api/v1/'
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'GET');
                assert.strictEqual(options.url, 'https://euc1.clockify.me/api/v1/user');
                assert.strictEqual(options.headers['X-Api-Key'], 'secret');
                return { data: { id: 'user-1' } };
            }
        };

        const result = await lib.request(context, { method: 'GET', url: '/user' });
        assert.deepStrictEqual(result, { id: 'user-1' });
    });

    it('paginates until the Last-Page header is true', async () => {
        let callCount = 0;
        const context = {
            auth: {
                apiKey: 'secret',
                apiBaseUrl: 'https://api.clockify.me/api/v1'
            },
            httpRequest: async (options) => {
                callCount += 1;
                assert.strictEqual(options.url, 'https://api.clockify.me/api/v1/workspaces/ws/clients');
                assert.strictEqual(options.params['page-size'], 100);

                if (callCount === 1) {
                    assert.strictEqual(options.params.page, 1);
                    return {
                        headers: { 'last-page': 'false' },
                        data: [{ id: 'client-1' }]
                    };
                }

                assert.strictEqual(options.params.page, 2);
                return {
                    headers: { 'last-page': 'true' },
                    data: [{ id: 'client-2' }]
                };
            }
        };

        const records = await lib.requestPaginated(context, { url: '/workspaces/ws/clients' });
        assert.deepStrictEqual(records, [{ id: 'client-1' }, { id: 'client-2' }]);
        assert.strictEqual(callCount, 2);
    });
});
