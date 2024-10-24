'use strict';
const commons = require('../../asana-commons');

/**
 * Component for fetching list of users
 * @extends {Component}
 */
module.exports = {

    async receive(context) {

        const generateOutputPortOptions = context.properties.generateOutputPortOptions;
        const { workspace, outputType } = context.messages.in.content;

        if (generateOutputPortOptions) {
            return this.getOutputPortOptions(context, outputType);
        }

        let client = commons.getAsanaAPI(context.auth.accessToken);

        let users;

        try {
            const res = await client.users.findByWorkspace(workspace);
            users = res.data;
        } catch (err) {
            if (!context.properties.ignoreErrors) {
                throw err;
            }
        }

        return commons.sendArrayOutput({
            context,
            outputPortName: 'users',
            outputType,
            records: users
        });
    },

    getOutputPortOptions(context, outputType) {

        if (outputType === 'item') {
            return context.sendJson(
                [
                    { label: 'gid', value: 'gid' },
                    { label: 'Name', value: 'name' },
                    { label: 'Resource type', value: 'resource_type' }
                ],
                'users'
            );
        } else if (outputType === 'items') {
            return context.sendJson(
                [
                    {
                        label: 'Users',
                        value: 'items',
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    'gid': { title: 'gid', type: 'string' },
                                    'name': { title: 'Name', type: 'string' },
                                    'resource_type': { title: 'Resource type', type: 'string' }
                                }
                            }
                        }
                    }
                ],
                'users'
            );
        } else {
            // file
            return context.sendJson([{ label: 'File ID', value: 'fileId' }], 'users');
        }
    }
};
