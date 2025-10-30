'use strict';

module.exports = {
    async receive(context) {
        const { url, method, body } = context.messages.in.content;
        const serverUrl = context.auth.serverUrl.replace(/\/$/, '');

        // Determine if URL is relative or absolute
        const isAbsoluteUrl = url.startsWith('http://') || url.startsWith('https://');
        const requestUrl = isAbsoluteUrl ? url : `${serverUrl}${url}`;

        const requestOptions = {
            method: method,
            url: requestUrl,
            headers: {
                'Authorization': `Bearer ${context.auth.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            requestOptions.data = JSON.parse(body);
        }

        try {
            const response = await context.httpRequest(requestOptions);

            return context.sendJson({
                status: response.status,
                headers: response.headers,
                body: response.data
            }, 'out');
        } catch (error) {
            const axiosError = error.response?.data;
            error.message = `${error.message}: ${axiosError?.errors?.[0]?.msg || axiosError?.message || ''}`;
            throw error;
        }
    }
};
