# Classification System Scripts

This directory contains tools for working with the component classification system.

## Scripts

### classify-component.js

Analyzes component manifests and suggests classifications.

**Usage:**
```bash
# Analyze a specific component
node scripts/classify-component.js src/appmixer/jira/issues/CreateIssue/component.json

# Generate statistics
node scripts/classify-component.js --statistics

# Sample analysis of all components
node scripts/classify-component.js --analyze-all

# Show help
node scripts/classify-component.js --help
```

**Features:**
- Automatically detects component type (action, trigger, etc.)
- Suggests relevant tags based on manifest structure
- Shows current classification if exists
- Generates comprehensive statistics

**Output Example:**
```
Component Analysis:
==================
Name: appmixer.jira.issues.CreateIssue
Description: Creates an issue on Jira.

Suggested Tags:
  - action: Standard action component
  - create: Creates a new item
  - dynamic-inputs: Has dynamically generated input fields
  ...

Suggested Complexity: moderate

Current Classification:
  Tags: action, create, dynamic-inputs, source-inputs, ...
  Complexity: moderate
  Notes: Creates Jira issues with dynamic fields...
```

### classification-examples.js

Demonstrates how to use the classification system with working examples.

**Usage:**
```bash
node scripts/classification-examples.js
```

**Examples Included:**
1. Find webhook trigger components
2. Find search/find components  
3. Find components with dynamic inputs
4. Generate tag usage statistics
5. Find components by connector

**Output Example:**
```
EXAMPLE 1: Find components for creating a webhook trigger
Required tags: trigger, webhook, state-management, deduplication

Found 5 matching components:

📌 appmixer.jira.issues.NewIssueWebhook
   Complexity: complex
   Tags: trigger, webhook, state-management, deduplication, ...
   Notes: Webhook trigger for new Jira issues...
```

## Related Files

- `../component-classification-taxonomy.json` - Tag definitions and characteristics
- `../component-classifications.json` - 59 classified components
- `../COMPONENT_CLASSIFICATION.md` - Full documentation
- `../CLASSIFICATION_QUICK_REFERENCE.md` - Quick reference for AI agents

## Adding New Classifications

To classify a new component:

1. Analyze it:
   ```bash
   node scripts/classify-component.js path/to/component.json
   ```

2. Review suggested tags and complexity

3. Add to `component-classifications.json`:
   ```json
   "appmixer.connector.module.ComponentName": {
     "tags": ["action", "create", "requires-auth", ...],
     "complexity": "moderate",
     "notes": "Brief description"
   }
   ```

4. Update statistics section

## For Developers

The scripts use the Node.js built-in modules and require the classification JSON files to be present in the repository root.

**Key Functions:**

`classify-component.js`:
- `analyzeComponent(path)` - Analyze a single component
- `findAllComponents(dir)` - Find all component.json files
- `generateStatistics()` - Generate statistics from classifications

`classification-examples.js`:
- `findComponentsByTags(tags)` - Find exact tag matches
- `findComponentsByAnyTag(tags)` - Find any tag matches
- `getTagStatistics(tags)` - Count tag usage

## Integration

These scripts are designed to be used:
- Manually by developers exploring components
- By AI agents to find reference components
- By CI/CD tools to validate new components
- By documentation generators

## Future Enhancements

Potential improvements:
- Add interactive mode for classification
- Export classifications to different formats
- Add visualization of tag relationships
- Integrate with component generator tools
- Add validation of component against its tags
