// Import all MySQL test files
describe('MySQL Connector Tests', function() {

    // Set overall timeout for all tests
    this.timeout(30000);

    before(function() {
        console.log('🔧 Starting MySQL Connector Test Suite');
        console.log('🔒 Testing SQL injection prevention and parameterized queries');
    });

    // Security tests for query handling
    describe('Query Security Tests', function() {
        require('./query-security.test.js');
    });

    after(function() {
        console.log('✅ MySQL Connector Test Suite Complete');
    });
});