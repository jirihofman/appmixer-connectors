'use strict';

const assert = require('assert');
const component = require('../../core/CreateTimeEntry/CreateTimeEntry');

describe('clockify CreateTimeEntry', () => {

    it('creates a time entry with optional fields normalized', async () => {
        const context = {
            auth: {
                apiKey: 'secret',
                apiBaseUrl: 'https://api.clockify.me/api/v1'
            },
            messages: {
                in: {
                    content: {
                        workspaceId: 'workspace-1',
                        start: '2026-05-23T09:00:00Z',
                        end: '2026-05-23T10:00:00Z',
                        projectId: 'project-1',
                        taskId: 'task-1',
                        tagIds: 'tag-1, tag-2',
                        description: 'Implementation',
                        billable: true,
                        type: 'REGULAR'
                    }
                }
            },
            httpRequest: async (options) => {
                assert.strictEqual(options.method, 'POST');
                assert.strictEqual(options.url, 'https://api.clockify.me/api/v1/workspaces/workspace-1/time-entries');
                assert.strictEqual(options.headers['X-Api-Key'], 'secret');
                assert.deepStrictEqual(options.data, {
                    start: '2026-05-23T09:00:00Z',
                    end: '2026-05-23T10:00:00Z',
                    projectId: 'project-1',
                    taskId: 'task-1',
                    tagIds: ['tag-1', 'tag-2'],
                    description: 'Implementation',
                    billable: true,
                    type: 'REGULAR'
                });
                return { data: { id: 'entry-1' } };
            },
            sendJson: async (data, port) => {
                assert.strictEqual(port, 'out');
                assert.deepStrictEqual(data, { id: 'entry-1' });
            },
            CancelError: class CancelError extends Error {}
        };

        await component.receive(context);
    });

    it('requires a start date', async () => {
        const context = {
            messages: {
                in: {
                    content: {
                        workspaceId: 'workspace-1'
                    }
                }
            },
            CancelError: class CancelError extends Error {}
        };

        await assert.rejects(() => component.receive(context), /Start is required/);
    });
});
