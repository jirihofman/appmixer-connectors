const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../../utils.js');
const action = require('../../../src/appmixer/trello/list/NewNotification/NewNotification.js');

describe('NewNotification', function() {

    let context;
    let lockStub;

    beforeEach(function() {
        lockStub = { unlock: sinon.stub() };

        context = testUtils.createMockContext();
        context.properties = {};

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
            const mockNotifications = [
                { id: 'notif1', type: 'addedToCard' },
                { id: 'notif2', type: 'commentCard' }
            ];

            context.httpRequest = sinon.stub().resolves({
                data: mockNotifications
            });

            await action.tick(context);

            assert.strictEqual(context.stateGet.callCount, 1);
            assert.strictEqual(context.stateGet.firstCall.args[0], 'known');
            assert.strictEqual(context.stateSet.callCount, 1);
            assert.strictEqual(context.stateSet.firstCall.args[0], 'known');
            assert.strictEqual(context.saveState.callCount, 0);
        });

        it('should detect new notifications when state exists', async function() {
            const existingNotifications = ['notif1'];
            const newNotifications = [
                { id: 'notif1', type: 'addedToCard' },
                { id: 'notif2', type: 'commentCard' }
            ];

            context.stateGet = sinon.stub().resolves(existingNotifications);
            context.httpRequest = sinon.stub().resolves({
                data: newNotifications
            });

            await action.tick(context);

            assert.strictEqual(context.sendJson.callCount, 1);
            assert.strictEqual(context.sendJson.firstCall.args[0].id, 'notif2');
            assert.strictEqual(context.sendJson.firstCall.args[1], 'notification');
        });

        it('should emit all notifications on first tick when state is empty', async function() {
            const notifications = [
                { id: 'notif1', type: 'addedToCard' },
                { id: 'notif2', type: 'commentCard' }
            ];

            context.stateGet = sinon.stub().resolves(null);
            context.httpRequest = sinon.stub().resolves({
                data: notifications
            });

            await action.tick(context);

            assert.strictEqual(context.sendJson.callCount, 2);
        });

        it('should update state with current notification IDs', async function() {
            const notifications = [
                { id: 'notif1', type: 'addedToCard' },
                { id: 'notif2', type: 'commentCard' }
            ];

            context.stateGet = sinon.stub().resolves([]);
            context.httpRequest = sinon.stub().resolves({
                data: notifications
            });

            await action.tick(context);

            const savedState = context.stateSet.firstCall.args[1];
            assert(Array.isArray(savedState));
            assert.strictEqual(savedState.length, 2);
            assert(savedState.includes('notif1'));
            assert(savedState.includes('notif2'));
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

        it('should prevent race conditions with concurrent tick calls', async function() {
            const notifications = [
                { id: 'notif1', type: 'addedToCard' },
                { id: 'notif2', type: 'commentCard' }
            ];

            let lockResolver;
            const lockPromise = new Promise(resolve => {
                lockResolver = resolve;
            });

            // First call gets the lock
            context.lock = sinon.stub().onFirstCall().returns(lockPromise).onSecondCall().resolves(lockStub);

            context.httpRequest = sinon.stub().resolves({
                data: notifications
            });

            // Start first tick (will wait for lock)
            const firstTick = action.tick(context);

            // Start second tick (should also wait for lock)
            const secondTick = action.tick(context);

            // Resolve the first lock
            lockResolver(lockStub);

            await Promise.all([firstTick, secondTick]);

            // Both should have tried to acquire lock
            assert.strictEqual(context.lock.callCount, 2);
            // Both should have released the lock
            assert.strictEqual(lockStub.unlock.callCount, 2);
        });
    });
});
