const fs = require('fs');
const { cwd } = require('process');
const assert = require('assert');
const sinon = require('sinon');
const testUtils = require('../utils.js');

describe('clerk lib.js', () => {

    let context;
    let lib;

    before(() => {
        // Stop if there are node modules installed in the connector folder.
        const connectorPath = cwd() + '/src/appmixer/clerk/node_modules';
        if (fs.existsSync(connectorPath)) {
            throw new Error(`For testing, please remove node_modules from ${connectorPath}`);
        }
        lib = require('../../src/appmixer/clerk/lib.js');
    });

    beforeEach(() => {
        context = testUtils.createMockContext();
        context.auth = {
            apiKey: 'test_api_key'
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('sendArrayOutput', () => {

        it('should send data as array by default', async () => {
            const records = [
                { id: '1', name: 'John' },
                { id: '2', name: 'Jane' }
            ];

            await lib.sendArrayOutput({
                context,
                outputPortName: 'out',
                outputType: 'array',
                records
            });

            assert(context.sendJson.calledOnce, 'context.sendJson should be called once');
            const args = context.sendJson.getCall(0).args;
            assert.deepStrictEqual(args[0], { result: records, count: 2 });
            assert.strictEqual(args[1], 'out');
        });

        it('should send data as objects one by one', async () => {
            const records = [
                { id: '1', name: 'John' },
                { id: '2', name: 'Jane' }
            ];

            await lib.sendArrayOutput({
                context,
                outputPortName: 'users',
                outputType: 'object',
                records
            });

            assert.strictEqual(context.sendJson.callCount, 2, 'context.sendJson should be called twice');
            
            const firstCall = context.sendJson.getCall(0).args;
            assert.deepStrictEqual(firstCall[0], { id: '1', name: 'John', index: 0, count: 2 });
            assert.strictEqual(firstCall[1], 'users');

            const secondCall = context.sendJson.getCall(1).args;
            assert.deepStrictEqual(secondCall[0], { id: '2', name: 'Jane', index: 1, count: 2 });
            assert.strictEqual(secondCall[1], 'users');
        });

        it('should send first record only for first output type', async () => {
            const records = [
                { id: '1', name: 'John' },
                { id: '2', name: 'Jane' }
            ];

            await lib.sendArrayOutput({
                context,
                outputPortName: 'user',
                outputType: 'first',
                records
            });

            assert(context.sendJson.calledOnce, 'context.sendJson should be called once');
            const args = context.sendJson.getCall(0).args;
            assert.deepStrictEqual(args[0], { id: '1', name: 'John', index: 0, count: 2 });
            assert.strictEqual(args[1], 'user');
        });

        it('should throw error for first output type with no records', async () => {
            const records = [];

            try {
                await lib.sendArrayOutput({
                    context,
                    outputPortName: 'user',
                    outputType: 'first',
                    records
                });
                assert.fail('Should have thrown CancelError');
            } catch (error) {
                assert(error instanceof context.CancelError);
                assert.strictEqual(error.message, 'No records available for first output type');
            }
        });

        it('should save data as CSV file for file output type', async () => {
            const records = [
                { id: '1', name: 'John', age: 25 },
                { id: '2', name: 'Jane', age: 30 }
            ];

            const mockFileId = 'file_123';
            context.saveFileStream = sinon.stub().resolves({ fileId: mockFileId });
            context.config.outputFilePrefix = 'test-export';
            context.flowDescriptor = {
                [context.componentId]: { label: 'TestComponent' }
            };

            await lib.sendArrayOutput({
                context,
                outputPortName: 'file',
                outputType: 'file',
                records
            });

            assert(context.saveFileStream.calledOnce, 'context.saveFileStream should be called once');
            assert(context.sendJson.calledOnce, 'context.sendJson should be called once');
            
            const saveFileArgs = context.saveFileStream.getCall(0).args;
            assert.strictEqual(saveFileArgs[0], 'test-export-TestComponent.csv');
            
            const buffer = saveFileArgs[1];
            const csvContent = buffer.toString('utf8');
            assert(csvContent.includes('id,name,age'));
            assert(csvContent.includes('1,John,25'));
            assert(csvContent.includes('2,Jane,30'));

            const sendJsonArgs = context.sendJson.getCall(0).args;
            assert.deepStrictEqual(sendJsonArgs[0], { fileId: mockFileId });
            assert.strictEqual(sendJsonArgs[1], 'file');
        });

        it('should throw error for unsupported output type', async () => {
            const records = [{ id: '1', name: 'John' }];

            try {
                await lib.sendArrayOutput({
                    context,
                    outputPortName: 'out',
                    outputType: 'unsupported',
                    records
                });
                assert.fail('Should have thrown CancelError');
            } catch (error) {
                assert(error instanceof context.CancelError);
                assert.strictEqual(error.message, 'Unsupported outputType unsupported');
            }
        });
    });

    describe('getProperty', () => {

        it('should get nested property value', () => {
            const obj = {
                user: {
                    profile: {
                        name: 'John Doe',
                        age: 30
                    }
                }
            };

            const result = lib.getProperty(obj, 'user.profile.name');
            assert.strictEqual(result, 'John Doe');
        });

        it('should return undefined for non-existent path', () => {
            const obj = { user: { name: 'John' } };
            const result = lib.getProperty(obj, 'user.profile.age');
            assert.strictEqual(result, undefined);
        });

        it('should handle null/undefined objects', () => {
            assert.strictEqual(lib.getProperty(null, 'test.path'), undefined);
            assert.strictEqual(lib.getProperty(undefined, 'test.path'), undefined);
        });

        it('should handle simple property access', () => {
            const obj = { name: 'John', age: 30 };
            assert.strictEqual(lib.getProperty(obj, 'name'), 'John');
            assert.strictEqual(lib.getProperty(obj, 'age'), 30);
        });
    });

    describe('getOutputPortOptions', () => {

        const mockItemSchema = {
            id: { type: 'string', title: 'User ID' },
            name: { type: 'string', title: 'User Name' },
            email: { type: 'string', title: 'Email Address' }
        };

        it('should return object options for object output type', async () => {
            const result = await lib.getOutputPortOptions(context, 'object', mockItemSchema, { label: 'Users' });

            assert(context.sendJson.calledOnce, 'context.sendJson should be called once');
            const args = context.sendJson.getCall(0).args;
            const options = args[0];
            
            assert(Array.isArray(options), 'Options should be an array');
            assert.strictEqual(options.length, 5, 'Should have 5 options (3 fields + index + count)');
            
            // Check that schema titles are used as labels
            const idOption = options.find(opt => opt.value === 'id');
            assert.strictEqual(idOption.label, 'User ID');
            
            const nameOption = options.find(opt => opt.value === 'name');
            assert.strictEqual(nameOption.label, 'User Name');
            
            // Check index and count options
            const indexOption = options.find(opt => opt.value === 'index');
            assert.strictEqual(indexOption.label, 'Current Item Index');
            assert.deepStrictEqual(indexOption.schema, { type: 'integer' });
            
            const countOption = options.find(opt => opt.value === 'count');
            assert.strictEqual(countOption.label, 'Items Count');
            assert.deepStrictEqual(countOption.schema, { type: 'integer' });
        });

        it('should return object options for first output type', async () => {
            await lib.getOutputPortOptions(context, 'first', mockItemSchema, { label: 'User' });

            assert(context.sendJson.calledOnce, 'context.sendJson should be called once');
            const args = context.sendJson.getCall(0).args;
            const options = args[0];
            
            assert(Array.isArray(options), 'Options should be an array');
            assert.strictEqual(options.length, 5, 'Should have 5 options (3 fields + index + count)');
        });

        it('should return array options for array output type', async () => {
            await lib.getOutputPortOptions(context, 'array', mockItemSchema, { label: 'Users List' });

            assert(context.sendJson.calledOnce, 'context.sendJson should be called once');
            const args = context.sendJson.getCall(0).args;
            const options = args[0];
            
            assert(Array.isArray(options), 'Options should be an array');
            assert.strictEqual(options.length, 2, 'Should have 2 options (count + result)');
            
            const countOption = options.find(opt => opt.value === 'count');
            assert.strictEqual(countOption.label, 'Items Count');
            
            const resultOption = options.find(opt => opt.value === 'result');
            assert.strictEqual(resultOption.label, 'Users List');
            assert.deepStrictEqual(resultOption.schema, {
                type: 'array',
                items: {
                    type: 'object',
                    properties: mockItemSchema
                }
            });
        });

        it('should return file options for file output type', async () => {
            await lib.getOutputPortOptions(context, 'file', mockItemSchema, { label: 'Export File' });

            assert(context.sendJson.calledOnce, 'context.sendJson should be called once');
            const args = context.sendJson.getCall(0).args;
            const options = args[0];
            
            assert(Array.isArray(options), 'Options should be an array');
            assert.strictEqual(options.length, 1, 'Should have 1 option (fileId)');
            
            const fileOption = options[0];
            assert.strictEqual(fileOption.label, 'File ID');
            assert.strictEqual(fileOption.value, 'fileId');
        });
    });
});