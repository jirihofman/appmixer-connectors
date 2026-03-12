#!/usr/bin/env node

/**
 * Example: Using Classification System to Find Reference Components
 * 
 * This example demonstrates how to use the classification system to find
 * reference components when building new components.
 */

const classifications = require('../component-classifications.json');

/**
 * Find components that match all required tags
 */
function findComponentsByTags(requiredTags) {
    return Object.entries(classifications.classifications)
        .filter(([name, data]) => 
            requiredTags.every(tag => data.tags.includes(tag))
        )
        .map(([name, data]) => ({
            name,
            tags: data.tags,
            complexity: data.complexity,
            notes: data.notes
        }));
}

/**
 * Find components that match any of the required tags
 */
function findComponentsByAnyTag(requiredTags) {
    return Object.entries(classifications.classifications)
        .filter(([name, data]) => 
            requiredTags.some(tag => data.tags.includes(tag))
        )
        .map(([name, data]) => ({
            name,
            matchingTags: data.tags.filter(t => requiredTags.includes(t)),
            allTags: data.tags,
            complexity: data.complexity,
            notes: data.notes
        }));
}

/**
 * Get statistics for specific tags
 */
function getTagStatistics(tags) {
    const stats = {};
    tags.forEach(tag => {
        stats[tag] = Object.values(classifications.classifications)
            .filter(data => data.tags.includes(tag))
            .length;
    });
    return stats;
}

// Example Usage

console.log('='.repeat(80));
console.log('EXAMPLE 1: Find components for creating a webhook trigger');
console.log('='.repeat(80));
console.log('\nRequired tags: trigger, webhook, state-management, deduplication\n');

const webhookTriggers = findComponentsByTags(['trigger', 'webhook', 'state-management', 'deduplication']);
console.log(`Found ${webhookTriggers.length} matching components:\n`);
webhookTriggers.forEach(comp => {
    console.log(`📌 ${comp.name}`);
    console.log(`   Complexity: ${comp.complexity}`);
    console.log(`   Tags: ${comp.tags.join(', ')}`);
    console.log(`   Notes: ${comp.notes}`);
    console.log();
});

console.log('='.repeat(80));
console.log('EXAMPLE 2: Find components for creating a Find/Search component');
console.log('='.repeat(80));
console.log('\nRequired tags: find, output-type, dynamic-outputs\n');

const findComponents = findComponentsByTags(['find', 'output-type', 'dynamic-outputs']);
console.log(`Found ${findComponents.length} matching components:\n`);
findComponents.slice(0, 5).forEach(comp => {
    console.log(`📌 ${comp.name}`);
    console.log(`   Complexity: ${comp.complexity}`);
    console.log(`   Tags: ${comp.tags.join(', ')}`);
    console.log(`   Notes: ${comp.notes}`);
    console.log();
});

console.log('='.repeat(80));
console.log('EXAMPLE 3: Find components with dynamic inputs');
console.log('='.repeat(80));
console.log('\nRequired tag: dynamic-inputs\n');

const dynamicInputComponents = findComponentsByTags(['dynamic-inputs']);
console.log(`Found ${dynamicInputComponents.length} matching components:\n`);
dynamicInputComponents.slice(0, 5).forEach(comp => {
    console.log(`📌 ${comp.name}`);
    console.log(`   Complexity: ${comp.complexity}`);
    console.log(`   Primary operation: ${comp.tags.filter(t => ['create', 'update', 'find'].includes(t)).join(', ')}`);
    console.log();
});

console.log('='.repeat(80));
console.log('EXAMPLE 4: Tag usage statistics');
console.log('='.repeat(80));

const interestingTags = [
    'trigger', 'webhook', 'polling', 
    'find', 'list', 'create', 
    'dynamic-inputs', 'dynamic-outputs', 'output-type',
    'state-management', 'caching', 'deduplication'
];

const tagStats = getTagStatistics(interestingTags);
console.log('\nTag usage across classified components:\n');
Object.entries(tagStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`${tag.padEnd(20)} ${bar} ${count}`);
    });

console.log('\n' + '='.repeat(80));
console.log('EXAMPLE 5: Find components by connector');
console.log('='.repeat(80));

function findByConnector(connectorName) {
    return Object.keys(classifications.classifications)
        .filter(name => name.split('.')[1] === connectorName)
        .map(name => ({
            name,
            ...classifications.classifications[name]
        }));
}

const jiraComponents = findByConnector('jira');
console.log(`\nJira components (${jiraComponents.length}):\n`);
jiraComponents.forEach(comp => {
    const mainType = comp.tags.find(t => ['create', 'update', 'delete', 'find', 'get', 'list', 'trigger'].includes(t));
    console.log(`  ${mainType?.toUpperCase().padEnd(8)} ${comp.name.split('.').pop()}`);
});

console.log('\n' + '='.repeat(80));
console.log('Usage Tips:');
console.log('='.repeat(80));
console.log(`
1. When building a new component, identify its required tags
2. Use findComponentsByTags() to find exact matches
3. Study the found components as reference implementations
4. Pay attention to complexity level - start with simpler examples
5. Look at components from different connectors to see variations

Example workflow:
  - Need to create: "Find Slack messages"
  - Tags: ['find', 'output-type', 'dynamic-outputs', 'oauth']
  - Find similar: FindIssues, FindNotes, FindDeals
  - Study their implementation patterns
  - Generate new component following these patterns
`);

console.log('='.repeat(80));
console.log('For more information, see:');
console.log('  - CLASSIFICATION_QUICK_REFERENCE.md (AI agent guide)');
console.log('  - COMPONENT_CLASSIFICATION.md (full documentation)');
console.log('  - component-classification-taxonomy.json (tag definitions)');
console.log('='.repeat(80));
