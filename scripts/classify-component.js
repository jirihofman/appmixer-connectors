#!/usr/bin/env node

/**
 * Component Classification Analyzer
 * 
 * This script analyzes Appmixer components and suggests classifications based on their manifest files.
 * It helps identify patterns and characteristics to improve the classification system.
 * 
 * Usage:
 *   node scripts/classify-component.js <path-to-component.json>
 *   node scripts/classify-component.js --analyze-all
 *   node scripts/classify-component.js --statistics
 */

const fs = require('fs');
const path = require('path');

// Load taxonomy and existing classifications
const taxonomyPath = path.join(__dirname, '..', 'component-classification-taxonomy.json');
const classificationsPath = path.join(__dirname, '..', 'component-classifications.json');

const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
const classifications = JSON.parse(fs.readFileSync(classificationsPath, 'utf8'));

/**
 * Analyze a component manifest and suggest tags
 */
function analyzeComponent(componentPath) {
    const manifest = JSON.parse(fs.readFileSync(componentPath, 'utf8'));
    const suggestedTags = [];
    let complexity = 'simple';
    
    // Analyze component type
    if (manifest.tick && manifest.webhook) {
        suggestedTags.push('trigger', 'webhook', 'polling');
        complexity = 'complex';
    } else if (manifest.webhook) {
        suggestedTags.push('trigger', 'webhook');
        complexity = 'complex';
    } else if (manifest.tick) {
        suggestedTags.push('trigger', 'polling');
        complexity = 'moderate';
    } else {
        suggestedTags.push('action');
    }
    
    // Analyze by component name patterns
    const componentName = manifest.name || '';
    const lastPart = componentName.split('.').pop();
    
    if (lastPart.startsWith('Find')) {
        suggestedTags.push('find');
        complexity = 'moderate';
    } else if (lastPart.startsWith('List')) {
        suggestedTags.push('list');
    } else if (lastPart.startsWith('Get')) {
        suggestedTags.push('get');
    } else if (lastPart.startsWith('Create')) {
        suggestedTags.push('create');
    } else if (lastPart.startsWith('Update')) {
        suggestedTags.push('update');
    } else if (lastPart.startsWith('Delete')) {
        suggestedTags.push('delete');
    } else if (lastPart.startsWith('New') || lastPart.includes('Webhook')) {
        if (!suggestedTags.includes('trigger')) {
            suggestedTags.push('trigger');
        }
    }
    
    // Analyze input/output characteristics
    if (manifest.properties) {
        suggestedTags.push('has-properties');
    }
    
    if (manifest.inPorts) {
        const inPorts = Array.isArray(manifest.inPorts) ? manifest.inPorts : [manifest.inPorts];
        inPorts.forEach(port => {
            if (typeof port === 'object' && port.source) {
                suggestedTags.push('dynamic-inputs');
                complexity = 'moderate';
            }
            if (typeof port === 'object' && port.inspector) {
                const inputs = port.inspector.inputs || {};
                Object.values(inputs).forEach(input => {
                    if (input.source) {
                        if (!suggestedTags.includes('source-inputs')) {
                            suggestedTags.push('source-inputs');
                        }
                    }
                    if (input.type === 'filepicker') {
                        suggestedTags.push('file-input');
                    }
                });
                
                // Check for outputType
                if (inputs.outputType) {
                    suggestedTags.push('output-type');
                }
            }
            
            // Check for multiple input ports
            if (inPorts.length > 1) {
                suggestedTags.push('multiple-inputs');
            }
        });
    }
    
    if (manifest.outPorts) {
        const outPorts = Array.isArray(manifest.outPorts) ? manifest.outPorts : [manifest.outPorts];
        
        // Check for dynamic outputs
        outPorts.forEach(port => {
            if (typeof port === 'object' && port.source) {
                suggestedTags.push('dynamic-outputs');
                complexity = 'moderate';
            }
        });
        
        // Check for multiple output ports
        if (outPorts.length > 1) {
            suggestedTags.push('multiple-outputs');
        }
        
        // Check for file output
        if (outPorts.some(p => p.options && p.options.some(o => o.value === 'fileId'))) {
            suggestedTags.push('file-output');
        }
        
        // Check for notFound port
        if (outPorts.some(p => p.name === 'notFound')) {
            if (!suggestedTags.includes('multiple-outputs')) {
                suggestedTags.push('multiple-outputs');
            }
        }
    }
    
    // Analyze authentication
    if (manifest.auth) {
        suggestedTags.push('requires-auth');
        // Note: Can't determine oauth vs api-key from manifest alone
    }
    
    // Analyze quota management
    if (manifest.quota) {
        suggestedTags.push('quota-managed');
    }
    
    // Check for transformation hints
    if (manifest.inPorts || manifest.outPorts || manifest.properties) {
        const manifestStr = JSON.stringify(manifest);
        if (manifestStr.includes('transform')) {
            suggestedTags.push('transformation');
        }
    }
    
    // Deduplicate tags
    const uniqueTags = [...new Set(suggestedTags)];
    
    return {
        component: manifest.name,
        description: manifest.description,
        tags: uniqueTags,
        complexity: complexity,
        manifest: manifest
    };
}

/**
 * Find all component.json files recursively
 */
function findAllComponents(dir = 'src/appmixer') {
    const results = [];
    
    function traverse(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            
            if (entry.isDirectory() && entry.name !== 'node_modules') {
                traverse(fullPath);
            } else if (entry.name === 'component.json') {
                results.push(fullPath);
            }
        }
    }
    
    traverse(dir);
    return results;
}

/**
 * Generate statistics from existing classifications
 */
function generateStatistics() {
    const stats = {
        total: Object.keys(classifications.classifications).length,
        byTag: {},
        byComplexity: {},
        byConnector: {}
    };
    
    Object.entries(classifications.classifications).forEach(([name, data]) => {
        // Count tags
        data.tags.forEach(tag => {
            stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
        
        // Count complexity
        stats.byComplexity[data.complexity] = (stats.byComplexity[data.complexity] || 0) + 1;
        
        // Count by connector
        const connector = name.split('.')[1];
        stats.byConnector[connector] = (stats.byConnector[connector] || 0) + 1;
    });
    
    // Sort tags by frequency
    stats.topTags = Object.entries(stats.byTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    
    return stats;
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        console.log('Component Classification Analyzer');
        console.log('');
        console.log('Usage:');
        console.log('  node scripts/classify-component.js <path-to-component.json>');
        console.log('  node scripts/classify-component.js --analyze-all');
        console.log('  node scripts/classify-component.js --statistics');
        console.log('');
        return;
    }
    
    if (args.includes('--statistics')) {
        const stats = generateStatistics();
        console.log('Classification Statistics:');
        console.log('=========================');
        console.log(`Total classified components: ${stats.total}`);
        console.log('');
        console.log('By Complexity:');
        Object.entries(stats.byComplexity).forEach(([complexity, count]) => {
            console.log(`  ${complexity}: ${count}`);
        });
        console.log('');
        console.log('Top 20 Tags:');
        stats.topTags.forEach(([tag, count]) => {
            console.log(`  ${tag}: ${count}`);
        });
        console.log('');
        console.log('By Connector:');
        Object.entries(stats.byConnector)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .forEach(([connector, count]) => {
                console.log(`  ${connector}: ${count}`);
            });
        return;
    }
    
    if (args.includes('--analyze-all')) {
        console.log('Finding all components...');
        const components = findAllComponents();
        console.log(`Found ${components.length} components`);
        console.log('');
        
        // Sample analysis of first 10
        console.log('Sample analysis (first 10 components):');
        console.log('======================================');
        components.slice(0, 10).forEach(componentPath => {
            try {
                const analysis = analyzeComponent(componentPath);
                console.log(`\n${analysis.component}`);
                console.log(`  Description: ${analysis.description}`);
                console.log(`  Tags: ${analysis.tags.join(', ')}`);
                console.log(`  Complexity: ${analysis.complexity}`);
            } catch (error) {
                console.log(`  Error analyzing: ${error.message}`);
            }
        });
        return;
    }
    
    // Analyze specific component
    const componentPath = args[0];
    if (!fs.existsSync(componentPath)) {
        console.error(`Error: Component file not found: ${componentPath}`);
        process.exit(1);
    }
    
    try {
        const analysis = analyzeComponent(componentPath);
        console.log('Component Analysis:');
        console.log('==================');
        console.log(`Name: ${analysis.component}`);
        console.log(`Description: ${analysis.description}`);
        console.log('');
        console.log('Suggested Tags:');
        analysis.tags.forEach(tag => {
            const tagInfo = findTagInfo(tag);
            console.log(`  - ${tag}${tagInfo ? ': ' + tagInfo : ''}`);
        });
        console.log('');
        console.log(`Suggested Complexity: ${analysis.complexity}`);
        console.log('');
        
        // Check if already classified
        if (classifications.classifications[analysis.component]) {
            console.log('Current Classification:');
            const current = classifications.classifications[analysis.component];
            console.log(`  Tags: ${current.tags.join(', ')}`);
            console.log(`  Complexity: ${current.complexity}`);
            console.log(`  Notes: ${current.notes || 'N/A'}`);
        }
    } catch (error) {
        console.error(`Error analyzing component: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Find tag description from taxonomy
 */
function findTagInfo(tag) {
    for (const category of Object.values(taxonomy.categories)) {
        if (category.tags && category.tags[tag]) {
            return category.tags[tag].description;
        }
    }
    return null;
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { analyzeComponent, findAllComponents, generateStatistics };
