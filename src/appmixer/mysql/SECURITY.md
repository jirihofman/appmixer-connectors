# MySQL Connector Security

## SQL Injection Prevention

The MySQL connector has been enhanced with multiple layers of protection against SQL injection attacks:

### 1. Parameterized Queries

The Query component now supports parameterized queries using `?` placeholders:

```javascript
// Safe usage with parameters
{
  "query": "SELECT * FROM users WHERE name = ? AND age > ?",
  "params": ["John Doe", 25]
}
```

Parameters are automatically escaped using MySQL's built-in `mysql.format()` function, which safely handles:
- Single quotes (`'`)
- Double quotes (`"`)
- Backslashes (`\`)
- Newlines and other control characters
- SQL injection attempts

### 2. Query Validation

All queries are validated to detect common SQL injection patterns:

- **Dangerous statements**: `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `DELETE`, `INSERT`, `UPDATE` when preceded by semicolons
- **Union attacks**: `UNION SELECT` patterns
- **System functions**: `LOAD_FILE()`, `BENCHMARK()`, `INTO OUTFILE`
- **Stored procedures**: `EXEC()`, `xp_*`, `sp_*` functions

### 3. Comment Stripping

SQL comments are removed during validation to prevent comment-based injection attacks:
- Line comments (`-- comment`)
- Block comments (`/* comment */`)

## Usage Guidelines

### Secure Query Examples

```javascript
// ✅ SAFE: Using parameterized queries
{
  "query": "SELECT * FROM users WHERE email = ?",
  "params": ["user@example.com"]
}

// ✅ SAFE: Multiple parameters
{
  "query": "SELECT * FROM orders WHERE user_id = ? AND created_at > ?",
  "params": [123, "2023-01-01"]
}

// ✅ SAFE: Simple queries without user input
{
  "query": "SELECT COUNT(*) FROM products WHERE active = 1"
}
```

### Blocked Query Examples

```javascript
// ❌ BLOCKED: SQL injection attempt
{
  "query": "SELECT * FROM users; DROP TABLE users; --"
}

// ❌ BLOCKED: Union attack
{
  "query": "SELECT * FROM users UNION SELECT password FROM admin"
}

// ❌ BLOCKED: File system access
{
  "query": "SELECT LOAD_FILE('/etc/passwd')"
}
```

## Backward Compatibility

Existing queries without parameters continue to work as before, but are subject to validation rules. For maximum security, migrate to parameterized queries:

```javascript
// Old way (still works but less secure)
{
  "query": "SELECT * FROM users WHERE status = 'active'"
}

// New way (recommended)
{
  "query": "SELECT * FROM users WHERE status = ?",
  "params": ["active"]
}
```

## Testing

The security improvements are covered by comprehensive unit tests in `test/mysql/query-security.test.js`. Run tests with:

```bash
npm run test-unit test/mysql/
```

## Error Handling

Security violations result in clear error messages:

- `Query is required.` - Empty or missing query
- `Output type is required.` - Missing output type
- `Invalid parameters format: ...` - Malformed parameters array
- `Query validation failed: Query contains potentially dangerous pattern: ...` - Blocked SQL injection attempt