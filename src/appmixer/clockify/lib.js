'use strict';

const pathModule = require('path');
const qs = require('qs');

const DEFAULT_API_BASE_URL = 'https://api.clockify.me/api/v1';
const DEFAULT_PREFIX = 'clockify';

const compact = (obj) => {
    return Object.entries(obj || {}).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
};

const parseList = (value) => {
    if (Array.isArray(value)) {
        return value.filter(item => item !== undefined && item !== null && item !== '');
    }

    if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }

    return undefined;
};

const normalizeBaseUrl = (url) => {
    return (url || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
};

const toCsv = (array) => {
    if (!array || array.length === 0) {
        return '';
    }

    const headers = Object.keys(array[0]);

    return [
        headers.join(','),
        ...array.map(item => {
            return headers.map(header => {
                const value = item[header];
                if (value === undefined || value === null) {
                    return '';
                }
                if (typeof value === 'object') {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        })
    ].join('\n');
};

module.exports = {

    DEFAULT_API_BASE_URL,

    compact,

    parseList,

    async request(context, options) {
        const apiBaseUrl = normalizeBaseUrl(context.auth?.apiBaseUrl || context.config?.apiBaseUrl);
        const url = options.url.startsWith('http') ? options.url : `${apiBaseUrl}${options.url}`;

        const response = await context.httpRequest({
            ...options,
            url,
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': context.auth.apiKey,
                ...(options.headers || {})
            }
        });

        return response.data;
    },

    async requestPaginated(context, options) {
        const {
            url,
            params = {},
            pageSize = 100,
            dataKey
        } = options;

        let page = 1;
        let records = [];

        while (true) {
            const apiBaseUrl = normalizeBaseUrl(context.auth?.apiBaseUrl || context.config?.apiBaseUrl);
            const response = await context.httpRequest({
                method: 'GET',
                url: `${apiBaseUrl}${url}`,
                headers: {
                    'X-Api-Key': context.auth.apiKey
                },
                paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
                params: compact({
                    ...params,
                    page,
                    'page-size': pageSize
                })
            });

            const data = dataKey ? response.data?.[dataKey] : response.data;
            const batch = Array.isArray(data) ? data : [];
            records = records.concat(batch);

            const lastPage = response.headers?.['last-page'] ?? response.headers?.['Last-Page'];
            if (String(lastPage).toLowerCase() === 'true') {
                break;
            }

            if (lastPage === undefined || batch.length === 0) {
                break;
            }

            page += 1;
        }

        return records;
    },

    async sendArrayOutput({
        context,
        outputPortName = 'out',
        outputType = 'array',
        records = []
    }) {

        if (outputType === 'first') {
            if (records.length === 0) {
                throw new context.CancelError('No records available for first output type.');
            }
            await context.sendJson({ ...records[0], index: 0, count: records.length }, outputPortName);
            return;
        }

        if (outputType === 'object') {
            for (let index = 0; index < records.length; index++) {
                await context.sendJson({ ...records[index], index, count: records.length }, outputPortName);
            }
            return;
        }

        if (outputType === 'array') {
            await context.sendJson({ result: records, count: records.length }, outputPortName);
            return;
        }

        if (outputType === 'file') {
            const csvString = toCsv(records);
            const buffer = Buffer.from(csvString, 'utf8');
            const componentName = context.flowDescriptor[context.componentId].label || context.componentId;
            const fileName = `${context.config.outputFilePrefix || DEFAULT_PREFIX}-${componentName}.csv`;
            const savedFile = await context.saveFileStream(pathModule.normalize(fileName), buffer);

            await context.log({ step: 'File was saved', fileName, fileId: savedFile.fileId });
            await context.sendJson({ fileId: savedFile.fileId }, outputPortName);
            return;
        }

        throw new context.CancelError('Unsupported outputType ' + outputType);
    },

    getOutputPortOptions(context, outputType, itemSchema, { label }) {
        if (outputType === 'object' || outputType === 'first') {
            const options = Object.keys(itemSchema)
                .reduce((res, field) => {
                    const schema = itemSchema[field];
                    const { title, ...schemaWithoutTitle } = schema;
                    res.push({
                        label: title,
                        value: field,
                        schema: schemaWithoutTitle
                    });
                    return res;
                }, [{
                    label: 'Current Item Index',
                    value: 'index',
                    schema: { type: 'integer', example: 0 }
                }, {
                    label: 'Items Count',
                    value: 'count',
                    schema: { type: 'integer', example: 1 }
                }]);

            return context.sendJson(options, 'out');
        }

        if (outputType === 'array') {
            return context.sendJson([{
                label: 'Items Count',
                value: 'count',
                schema: { type: 'integer', example: 1 }
            }, {
                label,
                value: 'result',
                schema: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: itemSchema
                    }
                }
            }], 'out');
        }

        if (outputType === 'file') {
            return context.sendJson([{ label: 'File ID', value: 'fileId', schema: { type: 'string', example: 'file-123' } }], 'out');
        }

        return context.sendJson([], 'out');
    }
};
