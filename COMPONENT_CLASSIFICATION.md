# Component Classification System

## Overview

The Component Classification System provides a structured taxonomy for categorizing and understanding Appmixer components. This system helps AI agents generate better code for new components by identifying patterns and best practices from existing components.

## Purpose

- **Consistent Architecture**: Ensures components follow established patterns across connectors
- **AI Code Generation**: Enables AI agents to find similar components and use them as templates
- **Developer Onboarding**: Helps new developers understand component patterns quickly
- **Pattern Documentation**: Documents best practices and common implementation patterns
- **Component Discovery**: Makes it easier to find and understand components

## Files

### 1. `component-classification-taxonomy.json`

Defines the classification system with categories, tags, and characteristics.

**Categories:**
- **component-type**: Primary purpose (action, find, list, trigger, webhook, etc.)
- **input-output**: Input/output characteristics (dynamic inputs/outputs, file handling, etc.)
- **technical-features**: Implementation details (caching, state management, authentication, etc.)
- **complexity**: Simple, moderate, or complex

**Structure:**
```json
{
  "categories": {
    "component-type": {
      "tags": {
        "action": {
          "description": "...",
          "characteristics": [...],
          "examples": [...]
        }
      }
    }
  }
}
```

### 2. `component-classifications.json`

Contains actual classifications of 60+ popular components across 22+ connectors.

**Structure:**
```json
{
  "classifications": {
    "appmixer.jira.issues.CreateIssue": {
      "tags": ["action", "create", "dynamic-inputs", ...],
      "complexity": "moderate",
      "notes": "..."
    }
  },
  "statistics": { ... }
}
```

**Covered Connectors:**
- jira, hubspot, slack, google (calendar, drive, gmail)
- monday, github, trello, salesforce, asana
- zendesk, pipedrive, freshdesk, mailchimp
- shopify, airtable, notion, stripe, twilio
- dropbox, box, intercom, microsoft (onedrive)

### 3. `scripts/classify-component.js`

Analyzes components and suggests classifications based on their manifest files.

## Usage

### For AI Agents

When creating a new component:

1. **Identify the component type and characteristics**
   ```
   Creating a search component → find, output-type, dynamic-outputs
   Creating a webhook trigger → trigger, webhook, state-management
   Creating a CRUD action → create/update/delete, dynamic-inputs
   ```

2. **Find similar components**
   ```javascript
   // Search for components with matching tags
   const similar = findComponentsWithTags(['find', 'output-type', 'dynamic-outputs']);
   // Result: FindIssues, FindNotes, FindDeals, FindContacts
   ```

3. **Use as reference templates**
   - Study the component.json structure
   - Follow the behavior patterns
   - Implement similar error handling
   - Use matching authentication patterns

4. **Follow tag characteristics**
   - Each tag has defined characteristics
   - Ensure your component follows these patterns
   - Maintain consistency with existing components

### For Developers

#### Analyze a specific component:
```bash
node scripts/classify-component.js src/appmixer/jira/issues/CreateIssue/component.json
```

Output:
```
Component Analysis:
==================
Name: appmixer.jira.issues.CreateIssue
Description: Creates an issue on Jira.

Suggested Tags:
  - action: Standard action component
  - create: Creates a new item
  - dynamic-inputs: Has dynamically generated input fields
  - source-inputs: Uses source property to populate inputs
  ...

Suggested Complexity: moderate
```

#### Get classification statistics:
```bash
node scripts/classify-component.js --statistics
```

Output shows:
- Total classified components
- Distribution by complexity
- Top 20 most common tags
- Components by connector

#### Analyze all components (sample):
```bash
node scripts/classify-component.js --analyze-all
```

## Tag Reference

### Component Type Tags

| Tag | Description | When to Use |
|-----|-------------|-------------|
| `action` | Standard action component | Component has inPorts and executes on input |
| `find` | Search/query component | Returns filtered results, has search params |
| `list` | Lists all items | Returns all items without filtering |
| `get` | Gets single item by ID | Retrieves one item by identifier |
| `create` | Creates new item | Creates new entity in external service |
| `update` | Updates existing item | Modifies existing entity |
| `delete` | Deletes item | Removes entity from external service |
| `trigger` | Event trigger | Starts workflows on events |
| `webhook` | Webhook-based trigger | Uses webhooks for real-time events |
| `polling` | Polling-based trigger | Uses tick mechanism to poll for changes |

### Input/Output Tags

| Tag | Description | Indicators |
|-----|-------------|-----------|
| `dynamic-inputs` | Dynamic input fields | Has source.url in inPorts |
| `dynamic-outputs` | Dynamic output fields | Has source.url in outPorts |
| `source-inputs` | Source-populated inputs | inspector inputs have source property |
| `output-type` | Has outputType selector | Has outputType field for array/first/object/file |
| `has-properties` | Uses properties config | Has properties instead of inPorts |
| `file-input` | Accepts file inputs | Has filepicker input type |
| `file-output` | Produces file outputs | Uses context.saveFileStream() |

### Technical Feature Tags

| Tag | Description | Implementation |
|-----|-------------|----------------|
| `caching` | Uses caching | context.staticCache |
| `quota-managed` | Rate limiting | Has quota section in manifest |
| `requires-auth` | Needs authentication | Has auth section in manifest |
| `oauth` | OAuth authentication | auth.js with type: 'oauth2' |
| `api-key` | API key auth | auth.js with type: 'apiKey' |
| `state-management` | Uses state | loadState()/saveState() |
| `locking` | Concurrency control | context.lock() |
| `batching` | Batch processing | Promise.all() for concurrent requests |
| `pagination` | Handles pagination | Fetches multiple pages |
| `transformation` | Data transformation | Transform functions for data conversion |
| `deduplication` | Prevents duplicates | Uses cache/state for dedup |
| `variable-fetch` | Dynamic data source | Handles variableFetch property |

## Complexity Levels

### Simple
- Single API call
- No complex state management
- Minimal error handling
- Few input fields
- **Examples**: GetIssue, DeleteNote, SendSMS

### Moderate
- Multiple API calls
- Basic state or cache management
- Dynamic inputs or outputs
- Standard error handling
- **Examples**: CreateIssue, FindNotes, ListProjects

### Complex
- Multiple dependent API calls
- Advanced state management
- Locking mechanisms
- Complex transformation logic
- Batching or pagination
- **Examples**: NewIssueWebhook, FindDeals, CreateRecord

## Examples

### Finding Reference Components

#### Example 1: Creating a Find Component
```javascript
// You're creating: appmixer.stripe.charges.FindCharges

// Search for similar components:
Tags needed: ['find', 'output-type', 'dynamic-outputs', 'api-key']

// Reference components:
- appmixer.jira.issues.FindIssues
- appmixer.hubspot.engagements.FindNotes
- appmixer.trello.cards.FindCards

// Study these components for:
- outputType implementation
- notFound port handling
- Dynamic output schema generation
- Search parameter patterns
```

#### Example 2: Creating a Webhook Trigger
```javascript
// You're creating: appmixer.servicename.events.NewEvent

// Search for similar components:
Tags needed: ['trigger', 'webhook', 'state-management', 'deduplication']

// Reference components:
- appmixer.jira.issues.NewIssueWebhook
- appmixer.slack.messages.NewMessage
- appmixer.shopify.orders.NewOrder

// Study these components for:
- Webhook lifecycle (start/stop/receive)
- Deduplication with cache and locking
- State management patterns
- context.getWebhookUrl() usage
```

#### Example 3: Creating a Component with Dynamic Fields
```javascript
// You're creating: appmixer.servicename.items.CreateItem

// Search for similar components:
Tags needed: ['create', 'dynamic-inputs', 'source-inputs', 'transformation']

// Reference components:
- appmixer.jira.issues.CreateIssue
- appmixer.airtable.records.CreateRecord
- appmixer.pipedrive.deals.CreateDeal

// Study these components for:
- Dynamic field generation based on configuration
- Source inputs for cascading dropdowns
- Transformation functions
- Error handling patterns
```

## Adding New Classifications

To add classifications for new components:

1. Analyze the component:
   ```bash
   node scripts/classify-component.js path/to/component.json
   ```

2. Review suggested tags and complexity

3. Add to `component-classifications.json`:
   ```json
   "appmixer.connector.module.ComponentName": {
     "tags": ["action", "create", "requires-auth", ...],
     "complexity": "moderate",
     "notes": "Brief description of key features"
   }
   ```

4. Update statistics section if needed

## Best Practices

1. **Be Consistent**: Use existing components with similar tags as templates
2. **Follow Patterns**: Each tag has defined characteristics - follow them
3. **Document Well**: Add clear notes explaining unique aspects
4. **Update Statistics**: Keep statistics up-to-date when adding classifications
5. **Review Regularly**: Periodically review and update classifications as patterns evolve

## Integration with AI Agents

AI agents should:

1. **Parse Requirements**: Understand what type of component is needed
2. **Identify Tags**: Determine relevant tags based on requirements
3. **Find References**: Search classifications for components with matching tags
4. **Study Patterns**: Analyze reference components to understand patterns
5. **Generate Code**: Create new component following identified patterns
6. **Validate**: Ensure generated code follows tag characteristics

Example AI workflow:
```
User Request: "Create a component to find Stripe subscriptions"

AI Process:
1. Identify: find component, needs search, returns list
2. Tags: ['find', 'output-type', 'dynamic-outputs', 'api-key', 'pagination']
3. Find similar: FindIssues, FindDeals, FindMembers
4. Study: Output type patterns, pagination, notFound port
5. Generate: New component following these patterns
6. Validate: Has outputType, notFound port, uses lib helpers
```

## Future Enhancements

- Automated classification using machine learning
- Pattern detection for anti-patterns
- Visualization tools for pattern relationships
- Integration with component generator tools
- Expanded coverage to all 1830+ components
- Pattern evolution tracking over time

## Questions?

For questions or suggestions about the classification system, please create an issue or reach out to the maintainers.
