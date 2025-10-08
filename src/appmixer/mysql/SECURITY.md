# MySQL Connector - SQL Injection Prevention

This document describes the security features and best practices for preventing SQL injection vulnerabilities in the MySQL connector.

## Security Features

The MySQL connector provides built-in helper functions to prevent SQL injection attacks:

### 1. escapeIdentifier(identifier)

Escapes database identifiers (table names, column names, database names) to prevent SQL injection.

```javascript
const { escapeIdentifier } = require('./common');

// Escape table names
const tableName = escapeIdentifier('users');
// Result: `users`

// Escape column names
const columnName = escapeIdentifier('email');
// Result: `email`

// Even malicious input is safely escaped
const malicious = escapeIdentifier("users`; DROP TABLE users; --");
// Result: `users``; DROP TABLE users; --`
```

### 2. escapeLiteral(literal)

Escapes literal values (strings, numbers, booleans, null) to prevent SQL injection.

```javascript
const { escapeLiteral } = require('./common');

// Escape string values
const name = escapeLiteral('John Doe');
// Result: 'John Doe'

// Even malicious input is safely escaped
const malicious = escapeLiteral("'; DROP TABLE users; --");
// Result: '\'; DROP TABLE users; --'

// Numbers are converted to strings
const id = escapeLiteral(123);
// Result: 123

// Null values
const nullValue = escapeLiteral(null);
// Result: NULL
```

## Best Practices

### Use Parameterized Queries

MySQL library supports parameterized queries using `?` placeholders for values and `??` for identifiers:

```javascript
const mysql = require('mysql');

// Safe SELECT query
const query = 'SELECT * FROM ?? WHERE ?? = ?';
const params = ['users', 'email', 'test@example.com'];
const formatted = mysql.format(query, params);
// Result: SELECT * FROM `users` WHERE `email` = 'test@example.com'

// Safe INSERT query
const query = 'INSERT INTO ?? (??, ??) VALUES (?, ?)';
const params = ['users', 'name', 'email', 'John Doe', 'john@example.com'];
const formatted = mysql.format(query, params);
// Result: INSERT INTO `users` (`name`, `email`) VALUES ('John Doe', 'john@example.com')

// Safe UPDATE query
const query = 'UPDATE ?? SET ?? = ? WHERE ?? = ?';
const params = ['users', 'status', 'active', 'id', 123];
const formatted = mysql.format(query, params);
// Result: UPDATE `users` SET `status` = 'active' WHERE `id` = 123

// Safe DELETE query
const query = 'DELETE FROM ?? WHERE ?? = ?';
const params = ['users', 'status', 'deleted'];
const formatted = mysql.format(query, params);
// Result: DELETE FROM `users` WHERE `status` = 'deleted'
```

### Handle IN Clauses

MySQL library automatically handles arrays in parameterized queries:

```javascript
const query = 'SELECT * FROM ?? WHERE ?? IN (?)';
const params = ['users', 'id', [1, 2, 3]];
const formatted = mysql.format(query, params);
// Result: SELECT * FROM `users` WHERE `id` IN (1, 2, 3)
```

## Examples in Components

### Query Component

The Query component already uses parameterized queries through the `runQuery` function:

```javascript
// In Query.js
const queryStream = await runQuery(conn, query, params);
```

When building queries, always use parameters instead of string concatenation:

```javascript
// ❌ VULNERABLE - Never do this
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;

// ✅ SAFE - Always use parameterized queries
const query = 'SELECT * FROM ?? WHERE ?? = ?';
const params = ['users', 'email', userEmail];
const formatted = mysql.format(query, params);
```

### Custom Components

When creating custom components, follow these guidelines:

1. **Never concatenate user input directly into SQL queries**
2. **Always use parameterized queries** with `?` and `??` placeholders
3. **Use escapeIdentifier()** when you need to manually escape table/column names
4. **Use escapeLiteral()** when you need to manually escape values

```javascript
// Example: Safe dynamic table query
const { escapeIdentifier, escapeLiteral } = require('./common');

// User-provided table name
const tableName = context.properties.table;

// Build safe query
const escapedTable = escapeIdentifier(tableName);
const query = `SELECT * FROM ${escapedTable} LIMIT 10`;

// Or better yet, use parameterized queries
const query = 'SELECT * FROM ?? LIMIT 10';
const params = [tableName];
const formatted = mysql.format(query, params);
```

## Common Attack Vectors

### 1. SQL Injection via String Concatenation

```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE name = '${userName}'`;

// ✅ SAFE
const query = 'SELECT * FROM users WHERE name = ?';
const params = [userName];
```

### 2. SQL Injection via Table Names

```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM ${tableName}`;

// ✅ SAFE
const query = 'SELECT * FROM ??';
const params = [tableName];
```

### 3. OR Bypass Attacks

```javascript
// Attacker input: ' OR '1'='1
// ❌ VULNERABLE - Results in: SELECT * FROM users WHERE password = '' OR '1'='1'
const query = `SELECT * FROM users WHERE password = '${password}'`;

// ✅ SAFE - Escapes the input: SELECT * FROM users WHERE password = '\' OR \'1\'=\'1'
const query = 'SELECT * FROM users WHERE password = ?';
const params = [password];
```

### 4. UNION Injection Attacks

```javascript
// Attacker input: ' UNION SELECT * FROM admin_users --
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ SAFE
const query = 'SELECT * FROM users WHERE id = ?';
const params = [userId];
```

## Testing

The MySQL connector includes comprehensive tests for SQL injection protection. Run them with:

```bash
npm run test-unit -- test/mysql/
```

All tests should pass, demonstrating that:
- Identifiers are properly escaped with backticks
- Literal values are properly escaped with quotes
- Parameterized queries prevent all common SQL injection attacks
- Malicious input is safely handled

## References

- [MySQL npm Package Documentation](https://www.npmjs.com/package/mysql)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [MySQL Documentation on Security](https://dev.mysql.com/doc/refman/8.0/en/security.html)
