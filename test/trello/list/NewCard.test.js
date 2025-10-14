const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../../utils.js');
const action = require('../../../src/appmixer/trello/list/NewCard/NewCard.js');

describe('NewCard', function() {

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
            const mockCards = [
                { id: 'card1', name: 'Test Card 1' },
                { id: 'card2', name: 'Test Card 2' }
            ];

            context.httpRequest = sinon.stub().resolves({
                data: mockCards
            });

            await action.tick(context);

            assert.strictEqual(context.stateGet.callCount, 1);
            assert.strictEqual(context.stateGet.firstCall.args[0], 'known');
            assert.strictEqual(context.stateSet.callCount, 1);
            assert.strictEqual(context.stateSet.firstCall.args[0], 'known');
            assert.strictEqual(context.saveState.callCount, 0);
        });

        it('should detect new cards when state exists', async function() {
            const existingCards = ['card1'];
            const newCards = [
                { id: 'card1', name: 'Test Card 1' },
                { id: 'card2', name: 'Test Card 2' }
            ];

            context.stateGet = sinon.stub().resolves(existingCards);
            context.httpRequest = sinon.stub().resolves({
                data: newCards
            });

            await action.tick(context);

            assert.strictEqual(context.sendJson.callCount, 1);
            assert.strictEqual(context.sendJson.firstCall.args[0].id, 'card2');
            assert.strictEqual(context.sendJson.firstCall.args[1], 'card');
        });

        it('should emit all cards on first tick when state is empty', async function() {
            const cards = [
                { id: 'card1', name: 'Test Card 1' },
                { id: 'card2', name: 'Test Card 2' }
            ];

            context.stateGet = sinon.stub().resolves(null);
            context.httpRequest = sinon.stub().resolves({
                data: cards
            });

            await action.tick(context);

            assert.strictEqual(context.sendJson.callCount, 2);
        });

        it('should update state with current card IDs', async function() {
            const cards = [
                { id: 'card1', name: 'Test Card 1' },
                { id: 'card2', name: 'Test Card 2' }
            ];

            context.stateGet = sinon.stub().resolves([]);
            context.httpRequest = sinon.stub().resolves({
                data: cards
            });

            await action.tick(context);

            const savedState = context.stateSet.firstCall.args[1];
            assert(Array.isArray(savedState));
            assert.strictEqual(savedState.length, 2);
            assert(savedState.includes('card1'));
            assert(savedState.includes('card2'));
        });

        it('should query board cards when no list is specified', async function() {
            context.properties = { boardId: 'board123' };
            context.httpRequest = sinon.stub().resolves({
                data: []
            });

            await action.tick(context);

            const url = context.httpRequest.firstCall.args[0].url;
            assert(url.includes('/1/boards/board123/cards'));
        });

        it('should query list cards when list is specified', async function() {
            context.properties = {
                boardId: 'board123',
                boardListId: 'list456'
            };
            context.httpRequest = sinon.stub().resolves({
                data: []
            });

            await action.tick(context);

            const url = context.httpRequest.firstCall.args[0].url;
            assert(url.includes('/1/lists/list456/cards'));
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
