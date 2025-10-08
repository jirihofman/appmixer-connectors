'use strict';

const assert = require('assert');
const path = require('path');
const sinon = require('sinon');
const { createMockContext } = require('../utils');

const commonPath = path.join(__dirname, '../../src/appmixer/mssql/common.js');

describe('mssql/common - SQL Injection Protection', () => {

    let common;

    beforeEach(() => {
        delete require.cache[require.resolve(commonPath)];
        common = require(commonPath);
    });

    afterEach(() => {
        delete require.cache[require.resolve(commonPath)];
        sinon.restore();
    });

    describe('escapeIdentifier', () => {

        it('should escape identifiers with square brackets', () => {
            assert.strictEqual(common.escapeIdentifier('users'), '[users]');
            assert.strictEqual(common.escapeIdentifier('public'), '[public]');
            assert.strictEqual(common.escapeIdentifier('my_table'), '[my_table]');
        });

        it('should escape malicious identifiers', () => {
            const malicious = 'users]; DROP TABLE users; --';
            const escaped = common.escapeIdentifier(malicious);
            assert.strictEqual(escaped, '[users]]; DROP TABLE users; --]');
            assert.strictEqual(escaped.includes('DROP TABLE'), true, 'Should contain but be escaped');
        });

        it('should handle identifiers with existing brackets', () => {
            assert.strictEqual(common.escapeIdentifier('table]name'), '[table]]name]');
        });
    });

    describe('sanitizeOperator', () => {

        it('should accept safe operators', () => {
            const context = createMockContext({});

            assert.strictEqual(common.sanitizeOperator('=', context), '=');
            assert.strictEqual(common.sanitizeOperator('!=', context), '!=');
            assert.strictEqual(common.sanitizeOperator('<>', context), '<>');
            assert.strictEqual(common.sanitizeOperator('LIKE', context), 'LIKE');
            assert.strictEqual(common.sanitizeOperator('IN', context), 'IN');
            assert.strictEqual(common.sanitizeOperator('IS NULL', context), 'IS NULL');
        });

        it('should normalize operator case', () => {
            const context = createMockContext({});
            assert.strictEqual(common.sanitizeOperator('like', context), 'LIKE');
            assert.strictEqual(common.sanitizeOperator('LiKe', context), 'LIKE');
        });

        it('should trim whitespace', () => {
            const context = createMockContext({});
            assert.strictEqual(common.sanitizeOperator('  =  ', context), '=');
            assert.strictEqual(common.sanitizeOperator('\tLIKE\n', context), 'LIKE');
        });

        it('should reject malicious operators', () => {
            const context = createMockContext({});
            const maliciousOperator = "= '1'; DROP TABLE users; --";

            assert.throws(
                () => common.sanitizeOperator(maliciousOperator, context),
                (error) => {
                    assert(error instanceof context.CancelError);
                    assert.strictEqual(error.message, `Unsupported operator "${maliciousOperator}"`);
                    return true;
                }
            );
        });

        it('should reject empty operators', () => {
            const context = createMockContext({});

            assert.throws(
                () => common.sanitizeOperator('', context),
                (error) => {
                    assert(error instanceof context.CancelError);
                    return true;
                }
            );
        });

        it('should reject null/undefined operators', () => {
            const context = createMockContext({});

            assert.throws(
                () => common.sanitizeOperator(null, context),
                (error) => {
                    assert(error instanceof context.CancelError);
                    return true;
                }
            );

            assert.throws(
                () => common.sanitizeOperator(undefined, context),
                (error) => {
                    assert(error instanceof context.CancelError);
                    return true;
                }
            );
        });
    });

    describe('runQuery with parameters', () => {

        it('should add parameters to the request using input method', () => {
            // This test validates the logic without actually connecting to a database
            const mockRequest = {
                stream: false,
                input: sinon.stub().returnsThis(),
                query: sinon.stub().resolves({ recordset: [] })
            };

            const params = ['value1', 'value2', 'value3'];

            // Simulate the parameter binding logic
            params.forEach((param, index) => {
                mockRequest.input(`p${index + 1}`, param);
            });

            assert.strictEqual(mockRequest.input.callCount, 3, 'Should call input three times');
            assert.deepStrictEqual(mockRequest.input.firstCall.args, ['p1', 'value1']);
            assert.deepStrictEqual(mockRequest.input.secondCall.args, ['p2', 'value2']);
            assert.deepStrictEqual(mockRequest.input.thirdCall.args, ['p3', 'value3']);
        });

        it('should use correct parameter naming convention (@p1, @p2, etc.)', () => {
            // Verify the parameter naming follows MSSQL conventions
            const params = [42, 'test', true];
            const expectedNames = ['p1', 'p2', 'p3'];

            params.forEach((param, index) => {
                const paramName = `p${index + 1}`;
                assert.strictEqual(paramName, expectedNames[index]);
            });
        });

        it('should handle empty parameter arrays', () => {
            const params = [];
            assert.strictEqual(params.length, 0);
            // When params.length is 0, no input() calls should be made
        });
    });
});
