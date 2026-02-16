'use strict';

module.exports = {
    async receive(context) {
        const {
            monitorId,
            url,
            pronounceable_name,
            check_frequency,
            call,
            sms,
            email,
            push,
            paused
        } = context.messages.in.content;

        if (!monitorId) {
            throw new context.CancelError('Monitor ID is required!');
        }

        const body = {};

        if (url) body.url = url;
        if (pronounceable_name) body.pronounceable_name = pronounceable_name;
        if (check_frequency) body.check_frequency = check_frequency;
        if (typeof call === 'boolean') body.call = call;
        if (typeof sms === 'boolean') body.sms = sms;
        if (typeof email === 'boolean') body.email = email;
        if (typeof push === 'boolean') body.push = push;
        if (typeof paused === 'boolean') body.paused = paused;

        await context.httpRequest({
            method: 'PATCH',
            url: `https://uptime.betterstack.com/api/v2/monitors/${monitorId}`,
            headers: {
                'Authorization': `Bearer ${context.auth.apiToken}`,
                'Content-Type': 'application/json'
            },
            data: body
        });

        return context.sendJson({}, 'out');
    }
};
