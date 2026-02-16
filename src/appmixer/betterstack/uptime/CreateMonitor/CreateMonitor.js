'use strict';

module.exports = {
    async receive(context) {
        const {
            url,
            monitor_type,
            pronounceable_name,
            check_frequency,
            call,
            sms,
            email,
            push
        } = context.messages.in.content;

        if (!url) {
            throw new context.CancelError('URL is required!');
        }

        const body = {
            url,
            monitor_type: monitor_type || 'status'
        };

        if (pronounceable_name) body.pronounceable_name = pronounceable_name;
        if (check_frequency) body.check_frequency = check_frequency;
        if (typeof call === 'boolean') body.call = call;
        if (typeof sms === 'boolean') body.sms = sms;
        if (typeof email === 'boolean') body.email = email;
        if (typeof push === 'boolean') body.push = push;

        const response = await context.httpRequest({
            method: 'POST',
            url: 'https://uptime.betterstack.com/api/v2/monitors',
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`,
                'Content-Type': 'application/json'
            },
            data: body
        });

        const monitor = response.data.data.attributes;
        return context.sendJson({
            id: response.data.data.id,
            type: response.data.data.type,
            ...monitor
        }, 'out');
    }
};
