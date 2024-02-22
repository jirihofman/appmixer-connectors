// Loop through all the package.json files and test them.

const path = require('path');
const { getTestFlowsJsonFiles } = require('./utils');
const fs = require('fs');
const jsonlint = require('jsonlint');

describe('test flows', () => {

    const testFlowsJsonFiles = getTestFlowsJsonFiles(path.join(__dirname, '..', '..', 'src', 'appmixer'));
    testFlowsJsonFiles.forEach(file => {

        const relativePath = path.relative(path.join(__dirname, '..', '..'), file);

        describe(relativePath, () => {

            it('formated', () => {

                checkJsonFormat(file);
            });
        });
    });
});

function checkJsonFormat(file) {

    // Parse the JSON file with jsonlint
    const parsed = jsonlint.parse(fs.readFileSync(file, 'utf8'));

    // Stringify the parsed JSON with 4 spaces indentation
    const formatted = JSON.stringify(parsed, null, 4);

    // Read the original file
    const original = fs.readFileSync(file, 'utf8');

    // Compare the formatted JSON with the original file
    if (formatted + '\n' !== original) {
        throw new Error('The JSON file is not correctly formatted. Use 4 spaces indentation.');
    }
}
