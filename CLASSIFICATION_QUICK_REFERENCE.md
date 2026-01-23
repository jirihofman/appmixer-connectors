# Component Classification Quick Reference for AI Agents

## How to Use This System When Creating Components

### Step 1: Identify Component Characteristics

Ask yourself these questions:
- What does this component do? (Create, Update, Delete, Find, List, Get, Send, etc.)
- Is it a trigger or an action?
- Does it have dynamic inputs/outputs?
- What authentication method does it use?
- Does it need state management, caching, or locking?

### Step 2: Determine Required Tags

Based on your answers, identify relevant tags from these categories:

#### Component Type (Pick one primary)
- `action` - Performs an operation when triggered
- `trigger` - Starts workflows on events
- `webhook` - Uses webhooks for real-time events
- `polling` - Uses tick mechanism for polling

#### Operation Type (Pick one if action)
- `find` - Searches with criteria, returns filtered results
- `list` - Returns all items
- `get` - Returns single item by ID
- `create` - Creates new item
- `update` - Updates existing item
- `delete` - Deletes item

#### Input/Output Features
- `dynamic-inputs` - Input fields generated from external data
- `dynamic-outputs` - Output schema generated at runtime
- `source-inputs` - Dropdown options from other components
- `output-type` - Has outputType selector (array/first/object/file)
- `has-properties` - Uses properties instead of inPorts
- `file-input` - Accepts file uploads
- `file-output` - Produces file outputs

#### Technical Features
- `requires-auth` - Needs authentication (almost always)
- `oauth` / `api-key` - Authentication method
- `quota-managed` - Has rate limiting
- `state-management` - Uses loadState/saveState
- `caching` - Uses context.staticCache
- `locking` - Uses context.lock()
- `pagination` - Handles paginated responses
- `transformation` - Uses transform functions
- `deduplication` - Prevents duplicate events
- `error-handling` - Has validation and error handling

### Step 3: Search for Reference Components

Use the classification data to find similar components:

```javascript
// Load classifications
const classifications = require('./component-classifications.json');

// Find components with matching tags
function findSimilar(requiredTags) {
    return Object.entries(classifications.classifications)
        .filter(([name, data]) => 
            requiredTags.every(tag => data.tags.includes(tag))
        )
        .map(([name, data]) => ({ name, ...data }));
}

// Example: Finding reference for a webhook trigger with deduplication
const similar = findSimilar(['trigger', 'webhook', 'state-management', 'deduplication']);
// Returns: NewIssueWebhook, NewMessage, NewOrder, etc.
```

### Step 4: Study Reference Components

For each reference component:
1. Read its component.json to understand structure
2. Read its behavior .js file to understand implementation
3. Note patterns for:
   - Input/output definition
   - Authentication usage
   - State management
   - Error handling
   - API calls

### Step 5: Follow Pattern Checklist

When implementing, ensure you follow the characteristics of your tags:

#### For `find` components:
- [ ] Component name starts with "Find"
- [ ] Has `outputType` field in schema
- [ ] Has `notFound` output port
- [ ] Uses `lib.sendArrayOutput()` helper
- [ ] Uses `lib.getOutputPortOptions()` for dynamic schema
- [ ] Returns max items per page (mention in description)
- [ ] No `limit` or `offset` input fields

#### For `webhook` triggers:
- [ ] Has `webhook: true` in manifest
- [ ] Implements `start()` method (register webhook)
- [ ] Implements `receive()` method (handle webhook)
- [ ] Implements `stop()` method (unregister webhook)
- [ ] Uses `context.getWebhookUrl()`
- [ ] Returns `context.response()` after processing
- [ ] Saves webhookId in state
- [ ] Uses deduplication with cache/lock if needed

#### For `polling` triggers:
- [ ] Has `tick: true` in manifest
- [ ] Implements `tick()` method
- [ ] Uses `loadState()`/`saveState()` to track known items
- [ ] Compares new items against known items
- [ ] Uses locking for long-running operations

#### For `create` components with dynamic inputs:
- [ ] Has `properties` for configuration
- [ ] Has `source.url` in inPorts for dynamic fields
- [ ] Uses transform functions to generate input schema
- [ ] Has required field validation
- [ ] Returns created item with ID

#### For `output-type` components:
- [ ] Has `outputType` field with options: first, array, object, file
- [ ] Uses `lib.sendArrayOutput({ context, outputType, records })`
- [ ] Uses `lib.getOutputPortOptions(context, outputType, schema, { label })`
- [ ] Never uses custom field names (always 'result' for array output)

## Common Patterns Reference

### Pattern 1: Find Component with outputType

**Tags:** `find`, `output-type`, `dynamic-outputs`, `multiple-outputs`

**Reference:** FindIssues, FindNotes, FindDeals

**Key Files:**
```
component.json:
  - outputType field in inPorts schema
  - notFound in outPorts
  - dynamic output via source.url

component.js:
  - Uses lib.sendArrayOutput()
  - Uses lib.getOutputPortOptions()
  - Handles notFound case
```

### Pattern 2: Webhook Trigger with Deduplication

**Tags:** `trigger`, `webhook`, `state-management`, `deduplication`, `locking`

**Reference:** NewIssueWebhook, NewMessage, NewOrder

**Key Features:**
```javascript
// start() - Register webhook
async start(context) {
    const webhookUrl = context.getWebhookUrl();
    const response = await registerWebhook(webhookUrl);
    return context.saveState({ webhookId: response.id });
}

// receive() - Handle webhook with deduplication
async receive(context) {
    if (context.messages.webhook) {
        let lock;
        try {
            lock = await context.lock(context.componentId);
            const cacheKey = `event-${eventId}`;
            const cached = await context.staticCache.get(cacheKey);
            if (cached) return context.response();
            
            await context.staticCache.set(cacheKey, eventId, 5000);
            await context.sendJson(data, 'out');
        } finally {
            await lock?.unlock();
        }
        return context.response();
    }
}

// stop() - Unregister webhook
async stop(context) {
    const { webhookId } = await context.loadState();
    if (webhookId) {
        await unregisterWebhook(webhookId);
    }
}
```

### Pattern 3: Create with Dynamic Inputs

**Tags:** `create`, `dynamic-inputs`, `source-inputs`, `has-properties`

**Reference:** CreateIssue, CreateRecord, CreateDeal

**component.json structure:**
```json
{
  "properties": {
    "schema": {
      "properties": {
        "projectId": { "type": "string" }
      }
    },
    "inspector": {
      "inputs": {
        "projectId": {
          "source": {
            "url": "/component/.../ListProjects?outPort=out"
          }
        }
      }
    }
  },
  "inPorts": [{
    "source": {
      "url": "/component/.../Metadata?outPort=out",
      "data": {
        "messages": {
          "in/project": "properties/projectId"
        },
        "transform": "./transformers#generateSchema"
      }
    }
  }]
}
```

### Pattern 4: List with outputType

**Tags:** `list`, `output-type`, `dynamic-outputs`

**Reference:** ListProjects, ListGroups, ListCalendars

**Implementation:**
```javascript
const lib = require('../../lib');

const schema = {
    'id': { 'type': 'string', 'title': 'ID' },
    'name': { 'type': 'string', 'title': 'Name' }
};

module.exports = {
    async receive(context) {
        const { outputType } = context.messages.in.content;
        
        if (context.properties.generateOutputPortOptions) {
            return lib.getOutputPortOptions(
                context, outputType, schema, 
                { label: 'Items', value: 'items' }
            );
        }
        
        const { data } = await context.httpRequest({ ... });
        const records = data.items || [];
        
        return lib.sendArrayOutput({ context, records, outputType });
    }
};
```

## Quick Decision Tree

```
Is it a trigger?
├─ Yes → trigger tag
│  ├─ Uses webhooks? → webhook tag
│  │  └─ Needs deduplication? → deduplication, locking, state-management
│  └─ Uses polling? → polling tag
│     └─ Always needs → state-management
│
└─ No → action tag
   ├─ What operation?
   │  ├─ Search/query → find tag
   │  │  └─ Usually needs → output-type, dynamic-outputs, multiple-outputs
   │  ├─ List all → list tag
   │  │  └─ Usually needs → output-type, dynamic-outputs
   │  ├─ Get by ID → get tag
   │  ├─ Create new → create tag
   │  │  └─ Complex fields? → dynamic-inputs, source-inputs
   │  ├─ Update existing → update tag
   │  └─ Delete → delete tag
   │
   └─ Additional features?
      ├─ File operations → file-input or file-output
      ├─ Dynamic fields → dynamic-inputs or dynamic-outputs
      ├─ Dropdown options → source-inputs
      └─ Complex logic → caching, locking, pagination, batching
```

## Example Scenarios

### Scenario 1: "Create a component to search for Slack messages"

**Step 1: Identify**
- Operation: Search/find
- Type: Action
- Returns: Multiple results
- Needs: Dynamic outputs, authentication

**Step 2: Tags**
`['action', 'find', 'output-type', 'dynamic-outputs', 'multiple-outputs', 'requires-auth', 'oauth', 'quota-managed']`

**Step 3: Find Similar**
- FindIssues (Jira)
- FindNotes (HubSpot)
- FindMembers (Mailchimp)

**Step 4: Study & Implement**
Follow the pattern from these components

### Scenario 2: "Create a webhook trigger for new Stripe charges"

**Step 1: Identify**
- Type: Webhook trigger
- Needs: Deduplication (webhooks can fire multiple times)
- Needs: State management for webhook ID

**Step 2: Tags**
`['trigger', 'webhook', 'state-management', 'deduplication', 'locking', 'requires-auth', 'api-key', 'quota-managed']`

**Step 3: Find Similar**
- NewEvent (Stripe - existing!)
- NewIssueWebhook (Jira)
- NewOrder (Shopify)

**Step 4: Study & Implement**
Use Stripe's NewEvent as primary reference

### Scenario 3: "Create a component to update Airtable records"

**Step 1: Identify**
- Operation: Update
- Type: Action
- Needs: Record ID
- May need: Dynamic fields based on table schema

**Step 2: Tags**
`['action', 'update', 'dynamic-inputs', 'requires-auth', 'api-key', 'quota-managed', 'error-handling']`

**Step 3: Find Similar**
- UpdateIssue (Jira)
- UpdateBoard (Monday)
- UpdateCard (Trello)

**Step 4: Study & Implement**
Check if Airtable update needs dynamic fields like create does

## Tips for AI Agents

1. **Always check existing classifications first** - Don't reinvent patterns
2. **Follow tag characteristics exactly** - They represent best practices
3. **Use multiple reference components** - See how different connectors solve similar problems
4. **Pay attention to lib.js helpers** - Use standard helpers for outputType, etc.
5. **Consider complexity early** - Complex components need more planning
6. **Validate against tag checklist** - Ensure you implement all required features

## Resources

- Full documentation: [COMPONENT_CLASSIFICATION.md](COMPONENT_CLASSIFICATION.md)
- Taxonomy: [component-classification-taxonomy.json](component-classification-taxonomy.json)
- Classifications: [component-classifications.json](component-classifications.json)
- Analyzer: [scripts/classify-component.js](scripts/classify-component.js)
