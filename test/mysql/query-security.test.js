'use strict';

const assert = require('assert');
const path = require('path');

describe('MySQL Query Security Tests', function() {

    let mysql;
    
    before(function() {
        mysql = require(path.join(__dirname, '../../src/appmixer/mysql/node_modules/mysql'));
    });

    describe('Parameter Escaping', function() {
        
        it('should properly escape malicious SQL injection attempts', function() {
            const maliciousInput = "'; DROP TABLE users; --";
            const safeQuery = 'SELECT * FROM users WHERE name = ?';
            
            const escapedQuery = mysql.format(safeQuery, [maliciousInput]);
            
            // The malicious input should be escaped within single quotes
            assert(escapedQuery.includes("'\\\'; DROP TABLE users; --'"));
            // The final query should be safe
            assert(escapedQuery === "SELECT * FROM users WHERE name = '\\\'; DROP TABLE users; --'");
        });

        it('should handle multiple parameters safely', function() {
            const params = [
                "'; DROP TABLE users; --",
                123,
                "normal string",
                null
            ];
            const query = 'SELECT * FROM users WHERE name = ? AND id = ? AND email = ? AND deleted_at = ?';
            
            const escapedQuery = mysql.format(query, params);
            
            assert(escapedQuery.includes('\\\'; DROP TABLE users; --'));
            assert(escapedQuery.includes('123'));
            assert(escapedQuery.includes("'normal string'"));
            assert(escapedQuery.includes('NULL'));
        });

        it('should escape special characters properly', function() {
            const specialChars = [
                "'",
                '"',
                "\\",
                "\n",
                "\r",
                "\x1a"
            ];
            
            specialChars.forEach(char => {
                const escaped = mysql.escape(char);
                assert(escaped !== char, `Character '${char}' should be escaped`);
            });
        });
    });

    describe('Query Validation Function', function() {

        let validateQuery;

        before(function() {
            // Create a standalone validation function for testing
            validateQuery = function(query) {
                if (!query || typeof query !== 'string') {
                    throw new Error('Query must be a non-empty string');
                }

                // Trim first to check if it's empty after removing whitespace
                const trimmedQuery = query.trim();
                if (!trimmedQuery) {
                    throw new Error('Query must be a non-empty string');
                }

                const normalizedQuery = query
                    .replace(/--.*$/gm, '')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                const dangerousPatterns = [
                    /;\s*(drop|alter|truncate|create|delete|insert|update)\s+/,
                    /union\s+select/,
                    /exec\s*\(/,
                    /xp_\w+/,
                    /sp_\w+/,
                    /into\s+outfile/,
                    /load_file\s*\(/,
                    /benchmark\s*\(/
                ];

                for (const pattern of dangerousPatterns) {
                    if (pattern.test(normalizedQuery)) {
                        throw new Error(`Query contains potentially dangerous pattern: ${pattern.source}`);
                    }
                }
            };
        });

        it('should reject queries with DROP TABLE', function() {
            const maliciousQueries = [
                "SELECT * FROM users; DROP TABLE users; --",
                "SELECT * FROM users;DROP TABLE users",
                "SELECT * FROM users; drop table users; --"
            ];

            maliciousQueries.forEach(query => {
                assert.throws(() => validateQuery(query), /dangerous pattern/);
            });
        });

        it('should reject UNION SELECT attacks', function() {
            const maliciousQueries = [
                "SELECT * FROM users WHERE id = 1 UNION SELECT password FROM admin",
                "SELECT * FROM users UNION select * from passwords"
            ];

            maliciousQueries.forEach(query => {
                assert.throws(() => validateQuery(query), /dangerous pattern/);
            });
        });

        it('should reject dangerous system functions', function() {
            const maliciousQueries = [
                "SELECT LOAD_FILE('/etc/passwd')",
                "SELECT load_file('/etc/shadow')",
                "SELECT * FROM users INTO OUTFILE '/tmp/users.txt'",
                "SELECT BENCHMARK(1000000, MD5('test'))"
            ];

            maliciousQueries.forEach(query => {
                assert.throws(() => validateQuery(query), /dangerous pattern/);
            });
        });

        it('should allow safe SELECT queries', function() {
            const safeQueries = [
                "SELECT * FROM users",
                "SELECT id, name FROM users WHERE active = 1",
                "SELECT COUNT(*) FROM orders WHERE created_at > '2023-01-01'",
                "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id"
            ];

            safeQueries.forEach(query => {
                assert.doesNotThrow(() => validateQuery(query));
            });
        });

        it('should reject null or empty queries', function() {
            assert.throws(() => validateQuery(null), /Query must be a non-empty string/);
            assert.throws(() => validateQuery(''), /Query must be a non-empty string/);
            assert.throws(() => validateQuery(123), /Query must be a non-empty string/);
            
            // Note: '   ' (spaces) gets trimmed to empty string
            try {
                validateQuery('   ');
                assert.fail('Should have thrown an error for whitespace-only query');
            } catch (error) {
                assert(error.message.includes('Query must be a non-empty string'));
            }
        });
    });

    describe('Integration Tests', function() {

        it('should demonstrate safe parameter usage', function() {
            // This test shows how to safely use parameters
            const userInput = "'; DROP TABLE users; --";
            const safeQuery = "SELECT * FROM users WHERE name = ?";
            
            // Using mysql.format safely escapes the parameter
            const finalQuery = mysql.format(safeQuery, [userInput]);
            
            // The final query should have the malicious input safely escaped
            assert(finalQuery === "SELECT * FROM users WHERE name = '\\\'; DROP TABLE users; --'");
        });

        it('should show the difference between safe and unsafe queries', function() {
            const userInput = "admin'; DROP TABLE users; --";
            
            // UNSAFE: Direct string concatenation (vulnerable to SQL injection)
            const unsafeQuery = `SELECT * FROM users WHERE name = '${userInput}'`;
            assert(unsafeQuery.includes("'; DROP TABLE users;"));
            
            // SAFE: Using parameterized queries
            const safeQuery = mysql.format("SELECT * FROM users WHERE name = ?", [userInput]);
            assert(safeQuery.includes("'admin\\\'; DROP TABLE users; --'"));
        });
    });
});