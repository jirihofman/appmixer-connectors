const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../../utils.js');
const action = require('../../../src/appmixer/trello/list/NewActivity/NewActivity.js');

describe('NewActivity', function() {

    let context;
    let lockStub;

    beforeEach(function() {
        lockStub = { unlock: sinon.stub() };

        context = testUtils.createMockContext();
        context.properties = {
            boardId: 'testBoardId'
        };

        // Setup lock stub
        context.lock = sinon.stub().resolves(lockStub);
    });

    afterEach(function() {
        sinon.restore();
    });

    describe('tick', function() {

        it('should acquire and release lock during tick', async function() {
            context.httpRequest = sinon.stub().resolves({
                data: []
            });

            await action.tick(context);

            assert.strictEqual(context.lock.callCount, 1);
            assert.strictEqual(context.lock.firstCall.args[0], context.componentId);
            assert.strictEqual(lockStub.unlock.callCount, 1);
        });

        it('should release lock even if error occurs', async function() {
            context.httpRequest = sinon.stub().rejects(new Error('API Error'));

            try {
                await action.tick(context);
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.message, 'API Error');
            }

            assert.strictEqual(lockStub.unlock.callCount, 1);
        });

        it('should use stateGet and stateSet instead of saveState', async function() {
            const mockActivities = [
                { id: 'activity1', type: 'createCard' },
                { id: 'activity2', type: 'updateCard' }
            ];

            context.httpRequest = sinon.stub().resolves({
                data: mockActivities
            });

            await action.tick(context);

            assert.strictEqual(context.stateGet.callCount, 1);
            assert.strictEqual(context.stateGet.firstCall.args[0], 'known');
            assert.strictEqual(context.stateSet.callCount, 1);
            assert.strictEqual(context.stateSet.firstCall.args[0], 'known');
            assert.strictEqual(context.saveState.callCount, 0);
        });

        it('should detect new activities when state exists', async function() {
            const existingActivities = ['activity1'];
            const newActivities = [
                { id: 'activity1', type: 'createCard' },
                { id: 'activity2', type: 'updateCard' }
            ];

            context.stateGet = sinon.stub().resolves(existingActivities);
            context.httpRequest = sinon.stub().resolves({
                data: newActivities
            });

            await action.tick(context);

            assert.strictEqual(context.sendJson.callCount, 1);
            assert.strictEqual(context.sendJson.firstCall.args[0].id, 'activity2');
            assert.strictEqual(context.sendJson.firstCall.args[1], 'activity');
        });

        it('should emit all activities on first tick when state is empty', async function() {
            const activities = [
                { id: 'activity1', type: 'createCard' },
                { id: 'activity2', type: 'updateCard' }
            ];

            context.stateGet = sinon.stub().resolves(null);
            context.httpRequest = sinon.stub().resolves({
                data: activities
            });

            await action.tick(context);

            assert.strictEqual(context.sendJson.callCount, 2);
        });

        it('should update state with current activity IDs', async function() {
            const activities = [
                { id: 'activity1', type: 'createCard' },
                { id: 'activity2', type: 'updateCard' }
            ];

            context.stateGet = sinon.stub().resolves([]);
            context.httpRequest = sinon.stub().resolves({
                data: activities
            });

            await action.tick(context);

            const savedState = context.stateSet.firstCall.args[1];
            assert(Array.isArray(savedState));
            assert.strictEqual(savedState.length, 2);
            assert(savedState.includes('activity1'));
            assert(savedState.includes('activity2'));
        });

        it('should respect custom lock TTL from config', async function() {
            context.config = { lockTTL: '10000' };
            context.httpRequest = sinon.stub().resolves({
                data: []
            });

            await action.tick(context);

            const lockOptions = context.lock.firstCall.args[1];
            assert.strictEqual(lockOptions.ttl, 10000);
        });

        it('should use default lock TTL when not configured', async function() {
            context.httpRequest = sinon.stub().resolves({
                data: []
            });

            await action.tick(context);

            const lockOptions = context.lock.firstCall.args[1];
            assert.strictEqual(lockOptions.ttl, 1000 * 60 * 5); // 5 minutes
        });
    });
});
