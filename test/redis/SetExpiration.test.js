const path = require('path');
const assert = require('assert');
const { createMockContext } = require('../utils');

const SetExpiration = require(path.join(__dirname, '../../src/appmixer/redis/core/SetExpiration/SetExpiration.js'));

describe('Redis SetExpiration Component', function() {
    it('should validate required seconds', async function() {
        const context = createMockContext();
        context.messages = {
            in: {
                content: {
                    key: 'test-key'
                }
            }
        };

        try {
            await SetExpiration.receive(context);
            assert.fail('Expected error for missing seconds');
        } catch (error) {
            assert(error.message.includes('Seconds'), 'Expected error about Seconds');
        }
    });
});
