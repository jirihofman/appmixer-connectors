'use strict';

const assert = require('assert');
const path = require('path');
const mysql = require('mysql');

const commonPath = path.join(__dirname, '../../src/appmixer/mysql/common.js');
const common = require(commonPath);

describe('mysql/common SQL injection protection', () => {

    describe('escapeIdentifier', () => {

        it('should escape table names with backticks', () => {
            const tableName = 'users';
            const escaped = common.escapeIdentifier(tableName);
            assert.strictEqual(escaped, '`users`', 'Table name should be wrapped in backticks');
        });

        it('should escape column names with backticks', () => {
            const columnName = 'email';
            const escaped = common.escapeIdentifier(columnName);
            assert.strictEqual(escaped, '`email`', 'Column name should be wrapped in backticks');
        });

        it('should prevent SQL injection in table names', () => {
            const maliciousTable = 'users`; DROP TABLE users; --';
            const escaped = common.escapeIdentifier(maliciousTable);

            // MySQL escapeId doubles the backticks to escape them
            assert.strictEqual(
                escaped,
                '`users``; DROP TABLE users; --`',
                'Malicious table name should be escaped'
            );
            assert.strictEqual(
                escaped.includes('DROP TABLE'),
                true,
                'DROP TABLE should be part of the escaped string, not executable SQL'
            );
        });

        it('should prevent SQL injection in column names', () => {
            const maliciousColumn = "name`; DELETE FROM users WHERE '1'='1";
            const escaped = common.escapeIdentifier(maliciousColumn);

            assert.strictEqual(
                escaped,
                "`name``; DELETE FROM users WHERE '1'='1`",
                'Malicious column name should be escaped'
            );
        });

        it('should handle database.table notation', () => {
            const identifier = 'mydb.mytable';
            const escaped = common.escapeIdentifier(identifier);
            assert.strictEqual(escaped, '`mydb`.`mytable`', 'Should escape database.table notation');
        });
    });

    describe('escapeLiteral', () => {

        it('should escape string values with single quotes', () => {
            const value = 'John Doe';
            const escaped = common.escapeLiteral(value);
            assert.strictEqual(escaped, "'John Doe'", 'String should be wrapped in single quotes');
        });

        it('should prevent SQL injection in string values', () => {
            const maliciousValue = "'; DROP TABLE users; --";
            const escaped = common.escapeLiteral(maliciousValue);

            // MySQL escape() properly escapes single quotes with backslash
            assert.strictEqual(
                escaped,
                "'\\'; DROP TABLE users; --'",
                'Malicious value should have quotes escaped'
            );
            // The escaped string should be safe to use in SQL
            assert.strictEqual(
                escaped.startsWith("'"),
                true,
                'Escaped value should start with quote'
            );
            assert.strictEqual(
                escaped.endsWith("'"),
                true,
                'Escaped value should end with quote'
            );
        });

        it('should escape numbers properly', () => {
            const numValue = 123;
            const escaped = common.escapeLiteral(numValue);
            assert.strictEqual(escaped, '123', 'Numbers should be converted to string');
        });

        it('should handle null values', () => {
            const nullValue = null;
            const escaped = common.escapeLiteral(nullValue);
            assert.strictEqual(escaped, 'NULL', 'null should be converted to SQL NULL');
        });

        it('should handle boolean values', () => {
            const trueValue = true;
            const falseValue = false;
            assert.strictEqual(common.escapeLiteral(trueValue), 'true', 'true should be converted to string');
            assert.strictEqual(common.escapeLiteral(falseValue), 'false', 'false should be converted to string');
        });

        it('should prevent OR bypass attacks', () => {
            const maliciousValue = "' OR '1'='1";
            const escaped = common.escapeLiteral(maliciousValue);

            assert.strictEqual(
                escaped,
                "'\\' OR \\'1\\'=\\'1'",
                'OR bypass attempt should be escaped'
            );
        });

        it('should prevent UNION injection attacks', () => {
            const maliciousValue = "' UNION SELECT * FROM users --";
            const escaped = common.escapeLiteral(maliciousValue);

            assert.strictEqual(
                escaped.includes('UNION SELECT'),
                true,
                'UNION SELECT should be part of escaped string'
            );
            assert.strictEqual(
                escaped.startsWith("'"),
                true,
                'Escaped value should start with quote'
            );
            assert.strictEqual(
                escaped.endsWith("'"),
                true,
                'Escaped value should end with quote'
            );
        });
    });

    describe('Parameterized query examples', () => {

        it('should demonstrate safe SELECT query with parameters', () => {
            // This is how developers should use parameterized queries in MySQL
            const query = 'SELECT * FROM ?? WHERE ?? = ?';
            const params = ['users', 'email', 'test@example.com'];

            // MySQL formats the query with parameters
            const formatted = mysql.format(query, params);

            assert.strictEqual(
                formatted,
                "SELECT * FROM `users` WHERE `email` = 'test@example.com'",
                'Query should be properly parameterized'
            );
        });

        it('should demonstrate safe INSERT query with parameters', () => {
            const query = 'INSERT INTO ?? (??, ??) VALUES (?, ?)';
            const params = ['users', 'name', 'email', 'John Doe', 'john@example.com'];

            const formatted = mysql.format(query, params);

            assert.strictEqual(
                formatted,
                "INSERT INTO `users` (`name`, `email`) VALUES ('John Doe', 'john@example.com')",
                'INSERT query should be properly parameterized'
            );
        });

        it('should demonstrate safe UPDATE query with parameters', () => {
            const query = 'UPDATE ?? SET ?? = ? WHERE ?? = ?';
            const params = ['users', 'status', 'active', 'id', 123];

            const formatted = mysql.format(query, params);

            assert.strictEqual(
                formatted,
                "UPDATE `users` SET `status` = 'active' WHERE `id` = 123",
                'UPDATE query should be properly parameterized'
            );
        });

        it('should demonstrate safe DELETE query with parameters', () => {
            const query = 'DELETE FROM ?? WHERE ?? = ?';
            const params = ['users', 'status', 'deleted'];

            const formatted = mysql.format(query, params);

            assert.strictEqual(
                formatted,
                "DELETE FROM `users` WHERE `status` = 'deleted'",
                'DELETE query should be properly parameterized'
            );
        });

        it('should prevent injection even with malicious parameters', () => {
            const query = 'SELECT * FROM ?? WHERE ?? = ?';
            const maliciousTable = 'users; DROP TABLE users; --';
            const maliciousColumn = "email' OR '1'='1";
            const maliciousValue = "'; DELETE FROM users WHERE '1'='1";
            const params = [maliciousTable, maliciousColumn, maliciousValue];

            const formatted = mysql.format(query, params);

            // All malicious input should be safely escaped
            assert.strictEqual(
                formatted.includes('DROP TABLE'),
                true,
                'DROP TABLE should be part of escaped identifier'
            );
            assert.strictEqual(
                formatted.includes('DELETE FROM'),
                true,
                'DELETE FROM should be part of escaped value'
            );
            assert.strictEqual(
                formatted.includes('`users; DROP TABLE users; --`'),
                true,
                'Malicious table name should be escaped'
            );
        });

        it('should handle IN clause with parameterized values', () => {
            const query = 'SELECT * FROM ?? WHERE ?? IN (?)';
            const params = ['users', 'id', [1, 2, 3, '4; DROP TABLE users;']];

            const formatted = mysql.format(query, params);

            assert.strictEqual(
                formatted,
                "SELECT * FROM `users` WHERE `id` IN (1, 2, 3, '4; DROP TABLE users;')",
                'IN clause should be properly parameterized'
            );
        });
    });
});
