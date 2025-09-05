'use strict';

module.exports = {
    async receive(context) {

        const {
            from,
            to: rawTo,
            subject,
            html,
            text,
            cc: rawCc,
            bcc: rawBcc,
            replyTo
        } = context.messages.in.content;

        // Helper function to normalize address fields
        function normalizeAddresses(val) {
            if (!val) return undefined;
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                return val.split(/[,\s\n]+/).map(s => s.trim()).filter(Boolean);
            }
            return val;
        }

        const to = normalizeAddresses(rawTo);
        const cc = normalizeAddresses(rawCc);
        const bcc = normalizeAddresses(rawBcc);

        // Validate required fields
        if (!from) {
            throw new context.CancelError('From email is required!');
        }
        if (!to || (Array.isArray(to) && to.length === 0)) {
            throw new context.CancelError('To email is required!');
        }
        if (!subject) {
            throw new context.CancelError('Subject is required!');
        }

        if (!html && !text) {
            throw new context.CancelError('Either HTML or text content is required!');
        }

        // Parse from address for SendGrid format
        let fromEmail = from;
        let fromName = null;
        const fromMatch = from.match(/^(.+?)\s*<(.+)>$/);
        if (fromMatch) {
            fromName = fromMatch[1].trim();
            fromEmail = fromMatch[2].trim();
        }

        // Prepare SendGrid request data
        const data = {
            personalizations: [
                {
                    to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }]
                }
            ],
            from: {
                email: fromEmail,
                ...(fromName && { name: fromName })
            },
            subject,
            content: []
        };

        // Add CC and BCC if provided
        if (cc && cc.length > 0) {
            data.personalizations[0].cc = Array.isArray(cc) ? cc.map(email => ({ email })) : [{ email: cc }];
        }
        if (bcc && bcc.length > 0) {
            data.personalizations[0].bcc = Array.isArray(bcc) ? bcc.map(email => ({ email })) : [{ email: bcc }];
        }

        // Add reply-to if provided
        if (replyTo) {
            data.reply_to = { email: replyTo };
        }

        // Add content
        if (text) {
            data.content.push({
                type: 'text/plain',
                value: text
            });
        }
        if (html) {
            data.content.push({
                type: 'text/html',
                value: html
            });
        }

        // Send the email
        const { data: responseData } = await context.httpRequest({
            method: 'POST',
            url: 'https://api.sendgrid.com/v3/mail/send',
            headers: {
                'Authorization': `Bearer ${context.auth.apiKey}`
            },
            data
        });

        return context.sendJson(responseData || {}, 'out');
    }
};
