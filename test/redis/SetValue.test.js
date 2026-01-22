const path = require('path');
const assert = require('assert');
const { createMockContext } = require('../utils');

const SetValue = require(path.join(__dirname, '../../src/appmixer/redis/core/SetValue/SetValue.js'));

describe('Redis SetValue Component', function() {
    it('should validate required value', async function() {
        const context = createMockContext();
        context.messages = {
            in: {
                content: {
                    key: 'test-key'
                }
            }
        };

        try {
            await SetValue.receive(context);
            assert.fail('Expected error for missing value');
        } catch (error) {
            assert(error.message.includes('Value'), 'Expected error about Value');
        }
    });
});
