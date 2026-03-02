'use strict';

const assert = require('assert');
const { Readable } = require('stream');
const testUtils = require('../../../../../test/utils');
const AddUsersFromCSVToUserList = require('../../core/AddUsersFromCSVToUserList/AddUsersFromCSVToUserList');

describe('AddUsersFromCSVToUserList', () => {

    let context;

    beforeEach(() => {
        context = testUtils.createMockContext();
        context.messages = { in: { content: {} } };
        context.auth.accessToken = 'token';
    });

    it('throws when fileId is missing', async () => {
        context.messages.in.content = {
            customerId: '7107133715',
            developerToken: 'dev-token',
            userListId: '9329730810'
        };

        await assert.rejects(() => AddUsersFromCSVToUserList.receive(context), {
            message: 'File ID is required!'
        });
    });

    it('throws when user list reference is missing', async () => {
        context.messages.in.content = {
            customerId: '7107133715',
            developerToken: 'dev-token',
            fileId: 'file-1'
        };

        await assert.rejects(() => AddUsersFromCSVToUserList.receive(context), {
            message: 'User List ID or User List Resource Name is required!'
        });
    });

    it('uploads rows from CSV in batches and reports invalid rows', async () => {
        const csv = [
            'Email,phone_number',
            'first@example.com,+14155550001',
            ',',
            'second@example.com,+14155550002'
        ].join('\n');

        context.messages.in.content = {
            customerId: '7107133715',
            developerToken: 'dev-token',
            userListId: '9329730810',
            fileId: 'file-1'
        };
        context.config.batchSize = '1';
        context.getFileReadStream.resolves(Readable.from(csv));
        context.httpRequest.onCall(0).resolves({ data: { receivedOperationsCount: 1 } });
        context.httpRequest.onCall(1).resolves({ data: { receivedOperationsCount: 1 } });

        await AddUsersFromCSVToUserList.receive(context);

        assert.strictEqual(context.httpRequest.callCount, 2);
        assert.strictEqual(context.sendJson.callCount, 1);
        const payload = context.sendJson.getCall(0).args[0];
        assert.strictEqual(payload.receivedOperationsCount, 2);
        assert.strictEqual(payload.numTotalEntries, 2);
        assert.strictEqual(payload.numInvalidEntries, 1);
        assert.strictEqual(payload.userListResourceName, 'customers/7107133715/userLists/9329730810');
        assert.strictEqual(Array.isArray(payload.invalidEntrySamples), true);
        assert.strictEqual(payload.invalidEntrySamples.length, 1);
    });

    it('schedules continuation when timeout threshold is reached', async () => {
        const csv = [
            'email',
            'first@example.com'
        ].join('\n');

        context.messages.in.content = {
            customerId: '7107133715',
            developerToken: 'dev-token',
            userListId: '9329730810',
            fileId: 'file-1'
        };
        context.config.timeoutTriggerSeconds = '0';
        context.getFileReadStream.resolves(Readable.from(csv));

        await AddUsersFromCSVToUserList.receive(context);

        assert.strictEqual(context.setTimeout.callCount, 1);
        assert.strictEqual(context.sendJson.callCount, 0);
        assert.strictEqual(context.httpRequest.callCount, 0);
        const timeoutPayload = context.setTimeout.getCall(0).args[0];
        assert.strictEqual(timeoutPayload.processedRows, 0);
        assert.strictEqual(timeoutPayload.receivedOperationsCount, 0);
        assert.strictEqual(timeoutPayload.numInvalidEntries, 0);
        assert.strictEqual(timeoutPayload.userListResourceName, 'customers/7107133715/userLists/9329730810');
    });
});
