const path = require('path');
const assert = require('assert');
const { createMockContext } = require('../utils');

const GetValue = require(path.join(__dirname, '../../src/appmixer/redis/core/GetValue/GetValue.js'));

describe('Redis GetValue Component', function() {
    it('should validate required key', async function() {
        const context = createMockContext();
        context.messages = {
            in: {
                content: {}
            }
        };

        try {
            await GetValue.receive(context);
            assert.fail('Expected error for missing key');
        } catch (error) {
            assert(error.message.includes('Key'), 'Expected error about Key');
        }
    });
});
