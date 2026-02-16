'use strict';

module.exports = {
    async receive(context) {
        const {
            monitorId,
            url,
            pronounceable_name: pronounceableName,
            check_frequency: checkFrequency,
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
        if (pronounceableName) body.pronounceable_name = pronounceableName;
        if (checkFrequency) body.check_frequency = checkFrequency;
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
