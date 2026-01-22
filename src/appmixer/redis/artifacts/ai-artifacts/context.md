# Redis Connector Context

This document provides context for generating an Appmixer Redis connector based on Redis 6.2 commands. Each command below will be implemented as a separate component.

## Overview

Redis is an in-memory data structure store used as a database, cache, and message broker. The connector will support the most common operations across different Redis data types.

**Documentation Reference**: https://redis.io/docs/latest/commands/redis-6-2-commands/

---

## Authentication

Redis typically uses one of these authentication methods:
- **Password only**: Single password authentication
- **Username + Password**: ACL-based authentication (Redis 6.0+)
- **Connection URL**: `redis://[[username:]password@]host[:port][/database]`

### auth.js Configuration

```javascript
module.exports = {
    type: 'apiKey',
    definition: {
        tokenType: 'authentication-token',
        auth: {
            host: {
                type: 'text',
                name: 'Host',
                tooltip: 'Redis server hostname (e.g., localhost or redis.example.com)'
            },
            port: {
                type: 'text',
                name: 'Port',
                tooltip: 'Redis server port (default: 6379)'
            },
            password: {
                type: 'password',
                name: 'Password',
                tooltip: 'Redis password (if authentication is enabled)'
            },
            database: {
                type: 'text',
                name: 'Database',
                tooltip: 'Redis database number (default: 0)'
            },
            tls: {
                type: 'toggle',
                name: 'Use TLS',
                tooltip: 'Enable TLS/SSL connection'
            }
        },
        validate: async (context) => {
            // Use ioredis or redis npm package to test connection
            // PING command should return PONG
            return true;
        }
    }
};
```

---

## Components

### 1. GET (GetValue)

**Description**: Returns the string value of a key. If the key does not exist, returns nil.

**Command Syntax**: `GET key`

**Category**: String Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The key to retrieve |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| value | string | The value stored at the key |
| exists | boolean | Whether the key exists |
| key | string | The key that was queried |

**Example**:
```
GET mykey
→ "Hello"
```

**Notes**:
- Returns null/nil if key doesn't exist
- An error is returned if the value stored at key is not a string

---

### 2. SET (SetValue)

**Description**: Sets the string value of a key. Creates the key if it doesn't exist. Overwrites existing value.

**Command Syntax**: `SET key value [EX seconds] [PX milliseconds] [NX|XX]`

**Category**: String Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The key to set |
| value | string | Yes | The value to store |
| expirationSeconds | integer | No | Set key expiration in seconds |
| expirationMilliseconds | integer | No | Set key expiration in milliseconds |
| condition | select | No | NX (only if not exists), XX (only if exists), or none |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| success | boolean | Whether the operation succeeded |
| key | string | The key that was set |
| value | string | The value that was stored |

**Example**:
```
SET mykey "Hello"
→ OK

SET mykey "Hello" EX 60
→ OK (expires in 60 seconds)

SET mykey "Hello" NX
→ OK (only if mykey doesn't exist)
```

---

### 3. DEL (DeleteKey)

**Description**: Deletes one or more keys. A key is ignored if it does not exist.

**Command Syntax**: `DEL key [key ...]`

**Category**: Generic Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The key to delete (can be comma-separated for multiple keys) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| deletedCount | integer | The number of keys that were deleted |
| keys | string | The keys that were requested for deletion |

**Example**:
```
SET key1 "Hello"
SET key2 "World"
DEL key1 key2 key3
→ (integer) 2
```

---

### 4. EXISTS (KeyExists)

**Description**: Determines whether one or more keys exist.

**Command Syntax**: `EXISTS key [key ...]`

**Category**: Generic Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The key(s) to check (can be comma-separated) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| count | integer | The number of keys that exist |
| exists | boolean | Whether at least one key exists |
| key | string | The key(s) that were checked |

**Example**:
```
SET key1 "Hello"
EXISTS key1
→ (integer) 1

EXISTS nosuchkey
→ (integer) 0

EXISTS key1 key2 nosuchkey
→ (integer) 2
```

---

### 5. EXPIRE (SetExpiration)

**Description**: Sets a timeout on a key. After the timeout expires, the key is automatically deleted.

**Command Syntax**: `EXPIRE key seconds [NX|XX|GT|LT]`

**Category**: Generic Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The key to set expiration on |
| seconds | integer | Yes | Timeout in seconds |
| condition | select | No | NX (only if no expiry), XX (only if has expiry), GT (only if new > current), LT (only if new < current) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| success | boolean | Whether the timeout was set (1) or not (0) |
| key | string | The key that was modified |
| seconds | integer | The expiration time that was set |

**Example**:
```
SET mykey "Hello"
EXPIRE mykey 10
→ (integer) 1

TTL mykey
→ (integer) 10
```

---

### 6. TTL (GetTimeToLive)

**Description**: Returns the remaining time to live of a key that has a timeout.

**Command Syntax**: `TTL key`

**Category**: Generic Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The key to check |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| ttl | integer | Remaining time in seconds (-2 if key doesn't exist, -1 if no expiration) |
| key | string | The key that was checked |
| hasExpiration | boolean | Whether the key has an expiration set |

**Example**:
```
SET mykey "Hello"
EXPIRE mykey 10
TTL mykey
→ (integer) 10

TTL nonexistent
→ (integer) -2

TTL persistent
→ (integer) -1
```

---

### 7. KEYS (FindKeys)

**Description**: Returns all keys matching a pattern.

**Command Syntax**: `KEYS pattern`

**Category**: Generic Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| pattern | string | Yes | Glob-style pattern (* matches any characters, ? matches single character) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| keys | array | Array of keys matching the pattern |
| count | integer | Number of keys found |
| pattern | string | The pattern that was used |

**Example**:
```
MSET firstname Jack lastname Stuntman age 35
KEYS *name*
→ ["firstname", "lastname"]

KEYS a??
→ ["age"]

KEYS *
→ ["firstname", "lastname", "age"]
```

**Warning**: KEYS should be used with caution in production as it can block the server when used on large databases.

---

### 8. HSET (SetHashField)

**Description**: Sets the specified field(s) in a hash stored at key. Creates the hash if it doesn't exist.

**Command Syntax**: `HSET key field value [field value ...]`

**Category**: Hash Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The hash key |
| field | string | Yes | The field name |
| value | string | Yes | The value to set |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| created | integer | Number of fields that were added (not updated) |
| key | string | The hash key |
| field | string | The field that was set |
| value | string | The value that was stored |

**Example**:
```
HSET myhash field1 "Hello"
→ (integer) 1

HSET myhash field1 "Hello" field2 "World"
→ (integer) 1
```

---

### 9. HGET (GetHashField)

**Description**: Returns the value associated with a field in a hash.

**Command Syntax**: `HGET key field`

**Category**: Hash Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The hash key |
| field | string | Yes | The field name |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| value | string | The value associated with the field (null if not found) |
| exists | boolean | Whether the field exists |
| key | string | The hash key |
| field | string | The field that was queried |

**Example**:
```
HSET myhash field1 "foo"
HGET myhash field1
→ "foo"

HGET myhash field2
→ (nil)
```

---

### 10. HGETALL (GetAllHashFields)

**Description**: Returns all fields and values in a hash.

**Command Syntax**: `HGETALL key`

**Category**: Hash Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The hash key |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| fields | object | Object containing all field-value pairs |
| fieldCount | integer | Number of fields in the hash |
| key | string | The hash key |
| exists | boolean | Whether the hash exists |

**Example**:
```
HSET myhash field1 "Hello" field2 "World"
HGETALL myhash
→ {"field1": "Hello", "field2": "World"}
```

---

### 11. LPUSH (ListPrepend)

**Description**: Prepends one or more elements to a list. Creates the list if it doesn't exist.

**Command Syntax**: `LPUSH key element [element ...]`

**Category**: List Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The list key |
| element | string | Yes | The element(s) to prepend (can be comma-separated) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| length | integer | The length of the list after the push operation |
| key | string | The list key |
| elements | string | The elements that were added |

**Example**:
```
LPUSH mylist "world"
→ (integer) 1

LPUSH mylist "hello"
→ (integer) 2

LRANGE mylist 0 -1
→ ["hello", "world"]
```

---

### 12. RPUSH (ListAppend)

**Description**: Appends one or more elements to a list. Creates the list if it doesn't exist.

**Command Syntax**: `RPUSH key element [element ...]`

**Category**: List Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The list key |
| element | string | Yes | The element(s) to append (can be comma-separated) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| length | integer | The length of the list after the push operation |
| key | string | The list key |
| elements | string | The elements that were added |

**Example**:
```
RPUSH mylist "hello"
→ (integer) 1

RPUSH mylist "world"
→ (integer) 2

LRANGE mylist 0 -1
→ ["hello", "world"]
```

---

### 13. LPOP (ListPopFirst)

**Description**: Removes and returns the first element(s) from a list.

**Command Syntax**: `LPOP key [count]`

**Category**: List Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The list key |
| count | integer | No | Number of elements to pop (default: 1) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| element | string | The popped element (or array if count > 1) |
| key | string | The list key |
| exists | boolean | Whether the list exists and had elements |

**Example**:
```
RPUSH mylist "one" "two" "three"
LPOP mylist
→ "one"

LPOP mylist 2
→ ["two", "three"]
```

---

### 14. LRANGE (ListGetRange)

**Description**: Returns elements from a list within a specified range.

**Command Syntax**: `LRANGE key start stop`

**Category**: List Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The list key |
| start | integer | Yes | Start index (0-based, negative values count from end) |
| stop | integer | Yes | Stop index (inclusive, negative values count from end) |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| elements | array | Array of elements in the specified range |
| count | integer | Number of elements returned |
| key | string | The list key |
| start | integer | The start index used |
| stop | integer | The stop index used |

**Example**:
```
RPUSH mylist "one" "two" "three"
LRANGE mylist 0 0
→ ["one"]

LRANGE mylist -3 2
→ ["one", "two", "three"]

LRANGE mylist 0 -1
→ ["one", "two", "three"]
```

---

### 15. INCR (IncrementValue)

**Description**: Increments the integer value of a key by one. If the key doesn't exist, it's set to 0 before incrementing.

**Command Syntax**: `INCR key`

**Category**: String Commands

**Inputs**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | The key to increment |

**Outputs**:
| Name | Type | Description |
|------|------|-------------|
| value | integer | The value after incrementing |
| key | string | The key that was incremented |

**Example**:
```
SET mykey "10"
INCR mykey
→ (integer) 11

INCR newkey
→ (integer) 1
```

**Notes**:
- An error is returned if the key contains a value that cannot be represented as an integer
- This operation is limited to 64-bit signed integers

---

## Component Summary Table

| Component Name | Redis Command | Category | Type |
|---------------|---------------|----------|------|
| GetValue | GET | String | Action |
| SetValue | SET | String | Action |
| DeleteKey | DEL | Generic | Action |
| KeyExists | EXISTS | Generic | Action |
| SetExpiration | EXPIRE | Generic | Action |
| GetTimeToLive | TTL | Generic | Action |
| FindKeys | KEYS | Generic | Action |
| SetHashField | HSET | Hash | Action |
| GetHashField | HGET | Hash | Action |
| GetAllHashFields | HGETALL | Hash | Action |
| ListPrepend | LPUSH | List | Action |
| ListAppend | RPUSH | List | Action |
| ListPopFirst | LPOP | List | Action |
| ListGetRange | LRANGE | List | Action |
| IncrementValue | INCR | String | Action |

---

## NPM Dependencies

```json
{
    "dependencies": {
        "ioredis": "^5.3.0"
    }
}
```

The `ioredis` package is recommended for its Promise support, cluster support, and robust connection handling.

---

## Connection Example

```javascript
const Redis = require('ioredis');

function createClient(context) {
    const { host, port, password, database, tls } = context.auth;
    
    return new Redis({
        host: host || 'localhost',
        port: parseInt(port) || 6379,
        password: password || undefined,
        db: parseInt(database) || 0,
        tls: tls ? {} : undefined,
        lazyConnect: true
    });
}
```

---

## Error Handling

Common Redis errors to handle:
- `WRONGTYPE`: Operation against a key holding the wrong kind of value
- `ERR`: General error (e.g., invalid arguments)
- Connection errors: Server unreachable, authentication failed
- `NOAUTH`: Authentication required

---

## Notes for Implementation

1. **Connection Management**: Use connection pooling or create clients per request based on the Appmixer execution model
2. **Data Types**: Redis stores everything as strings; convert appropriately in component logic
3. **Error Messages**: Provide clear error messages when operations fail
4. **Timeouts**: Consider adding connection timeouts to auth configuration
5. **Cluster Support**: Consider supporting Redis Cluster for enterprise use cases
