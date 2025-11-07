# Redis Connector for Appmixer

This connector provides integration with Redis database using the [ioredis](https://github.com/redis/ioredis) library.

## Authentication

The Redis connector supports flexible authentication methods:

### Option 1: Individual Connection Fields
- **Host**: Redis server hostname or IP address (default: 127.0.0.1)
- **Port**: Redis server port (default: 6379)
- **Username**: Redis username (required for Redis >= 6 with ACL)
- **Password**: Redis password
- **Database**: Database number (default: 0)

### Option 2: Connection URI
Alternatively, you can provide a full Redis connection URI:
```
redis://username:password@host:port/db
```

Example:
```
redis://default:my-secret@127.0.0.1:6379/0
```

## Components

### 1. Set
Store a key-value pair in Redis with optional expiration.

**Inputs:**
- `key` (required): The key to store
- `value` (required): The value to store
- `expirationSeconds` (optional): Time in seconds before the key expires (TTL)

**Outputs:**
- `key`: The key that was set
- `status`: Operation status (typically "OK")

### 2. Get
Retrieve a value from Redis by key.

**Inputs:**
- `key` (required): The key to retrieve

**Outputs:**
- `key`: The requested key
- `value`: The value stored at the key (empty string if key doesn't exist)
- `exists`: Boolean indicating if the key exists

### 3. Delete
Delete a key from Redis.

**Inputs:**
- `key` (required): The key to delete

**Outputs:**
- `key`: The key that was deleted
- `deletedCount`: Number of keys deleted (0 or 1)

### 4. Exists
Check if a key exists in Redis.

**Inputs:**
- `key` (required): The key to check

**Outputs:**
- `key`: The checked key
- `exists`: Boolean indicating if the key exists

### 5. Keys
List keys in Redis matching a pattern.

**⚠️ WARNING**: Use with caution in production environments as the KEYS command can be slow on large databases.

**Inputs:**
- `pattern` (required): Pattern to match keys
  - `*` - All keys
  - `user:*` - Keys starting with "user:"
  - `*:name` - Keys ending with ":name"
  - `user:*:email` - Keys matching the pattern

**Outputs:**
- `keys`: Array of matching key names
- `count`: Number of keys found

## Examples

### Example 1: Store User Session
```javascript
// Set component
key: "session:user123"
value: JSON.stringify({ userId: 123, loggedIn: true })
expirationSeconds: 3600  // 1 hour
```

### Example 2: Cache API Response
```javascript
// Set component
key: "cache:api:users"
value: JSON.stringify(apiResponse)
expirationSeconds: 300  // 5 minutes

// Get component (later)
key: "cache:api:users"
// Returns the cached value if still valid
```

### Example 3: Feature Flags
```javascript
// Set component
key: "feature:newUI:enabled"
value: "true"

// Exists component (to check if feature is enabled)
key: "feature:newUI:enabled"
// Returns: { exists: true }
```

## Technical Details

- **Library**: ioredis v5.4.1
- **Connection Management**: Each component creates a new connection and properly closes it after use
- **Error Handling**: All components include proper error handling and required field validation
- **Redis Version Support**: Works with Redis 6+ (with ACL support) and earlier versions

## Notes

1. All components properly manage Redis connections (connect and disconnect)
2. Error messages are clear and helpful for debugging
3. The `Keys` component should be used sparingly in production due to potential performance impact
4. All string values are stored as-is; for complex objects, use JSON.stringify before storing
