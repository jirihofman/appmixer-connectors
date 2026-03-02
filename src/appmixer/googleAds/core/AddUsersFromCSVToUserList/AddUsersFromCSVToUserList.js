'use strict';

const readline = require('readline');
const lib = require('../../lib');

module.exports = {

    async receive(context) {

        const BATCH_SIZE = parseIntegerOption(context.config.batchSize, 1000);
        const TIMEOUT_TRIGGER_SECONDS = parseNumberOption(context.config.timeoutTriggerSeconds, 60 * 5);
        const TIMEOUT_SECONDS = parseIntegerOption(context.config.timeoutSeconds, 60);
        const MAX_CONTINUATION_PERIOD_SECONDS =
            parseIntegerOption(context.config.maxContinuationPeriodSeconds, 60 * 60 * 12);

        let customerId;
        let developerToken;
        let loginCustomerId;
        let userListId;
        let userListResourceName;
        let fileId;
        let delimiter;
        let adUserDataConsent;
        let adPersonalizationConsent;
        let processedRows;
        let receivedOperationsCount;
        let numInvalidEntries;
        let invalidEntrySamples;
        let timeStart;

        if (context.messages.timeout) {
            const msg = context.messages.timeout.content;
            customerId = msg.customerId;
            developerToken = msg.developerToken;
            loginCustomerId = msg.loginCustomerId;
            userListId = msg.userListId;
            userListResourceName = msg.userListResourceName;
            fileId = msg.fileId;
            delimiter = msg.delimiter;
            adUserDataConsent = msg.adUserDataConsent;
            adPersonalizationConsent = msg.adPersonalizationConsent;
            processedRows = msg.processedRows || 0;
            receivedOperationsCount = msg.receivedOperationsCount || 0;
            numInvalidEntries = msg.numInvalidEntries || 0;
            invalidEntrySamples = msg.invalidEntrySamples || [];
            timeStart = new Date(msg.timeStart);
        } else {
            const msg = context.messages.in.content;
            customerId = msg.customerId;
            developerToken = msg.developerToken;
            loginCustomerId = msg.loginCustomerId;
            userListId = msg.userListId;
            userListResourceName = msg.userListResourceName;
            fileId = msg.fileId;
            delimiter = msg.delimiter || ',';
            adUserDataConsent = msg.adUserDataConsent;
            adPersonalizationConsent = msg.adPersonalizationConsent;
            processedRows = 0;
            receivedOperationsCount = 0;
            numInvalidEntries = 0;
            invalidEntrySamples = [];
            timeStart = new Date();
        }

        lib.ensureRequired(customerId, 'Customer ID is required!', context);
        lib.ensureRequired(developerToken, 'Developer Token is required!', context);
        lib.ensureRequired(fileId, 'File ID is required!', context);

        if ((new Date() - timeStart) >= (MAX_CONTINUATION_PERIOD_SECONDS * 1000)) {
            throw new context.CancelError('Error uploading users. Max upload time reached. Check your CSV file and retry manually later.');
        }

        const normalizedCustomerId = lib.normalizeCustomerId(customerId);
        const normalizedUserListId = String(userListId || '').replace(/[^0-9]/g, '');
        const resolvedUserListResourceName = userListResourceName
            ? String(userListResourceName)
            : (normalizedUserListId
                ? `customers/${normalizedCustomerId}/userLists/${normalizedUserListId}`
                : null);

        lib.ensureRequired(
            resolvedUserListResourceName,
            'User List ID or User List Resource Name is required!',
            context
        );

        const receiveTimeStart = new Date();
        const scheduleContinuation = async reason => {
            await context.log({
                step: 'continuation',
                reason,
                processedRows,
                receivedOperationsCount,
                numInvalidEntries
            });

            return context.setTimeout({
                customerId,
                developerToken,
                loginCustomerId,
                userListId,
                userListResourceName: resolvedUserListResourceName,
                fileId,
                delimiter,
                adUserDataConsent,
                adPersonalizationConsent,
                processedRows,
                receivedOperationsCount,
                numInvalidEntries,
                invalidEntrySamples,
                timeStart: (new Date(timeStart)).getTime()
            }, TIMEOUT_SECONDS * 1000);
        };

        const fileStream = await context.getFileReadStream(fileId);
        const reader = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let batch = [];
        let skippedRows = processedRows;
        let headers;
        try {
            for await (const line of reader) {
                if (!line || !line.trim()) {
                    continue;
                }

                if (!headers) {
                    headers = splitCsvLine(line, delimiter).map(normalizeHeader);
                    continue;
                }

                const row = mapRow(headers, splitCsvLine(line, delimiter));

                if (skippedRows > 0) {
                    skippedRows -= 1;
                    continue;
                }

                if ((new Date() - receiveTimeStart) >= TIMEOUT_TRIGGER_SECONDS * 1000) {
                    return scheduleContinuation('timeout');
                }

                const userData = buildUserDataFromRow(
                    row,
                    adUserDataConsent,
                    adPersonalizationConsent
                );

                if (!userData) {
                    numInvalidEntries += 1;
                    if (invalidEntrySamples.length < 20) {
                        invalidEntrySamples.push(row);
                    }
                    continue;
                }

                batch.push({ create: userData });
                if (batch.length >= BATCH_SIZE) {
                    const response = await uploadBatch(context, {
                        normalizedCustomerId,
                        developerToken,
                        loginCustomerId,
                        userListResourceName: resolvedUserListResourceName,
                        operations: batch
                    });
                    receivedOperationsCount += response.data.receivedOperationsCount || 0;
                    processedRows += batch.length;
                    batch = [];
                }
            }
        } finally {
            reader.close();
        }

        if (batch.length) {
            const response = await uploadBatch(context, {
                normalizedCustomerId,
                developerToken,
                loginCustomerId,
                userListResourceName: resolvedUserListResourceName,
                operations: batch
            });
            receivedOperationsCount += response.data.receivedOperationsCount || 0;
            processedRows += batch.length;
        }

        return context.sendJson({
            userListResourceName: resolvedUserListResourceName,
            receivedOperationsCount,
            numTotalEntries: processedRows,
            numInvalidEntries,
            invalidEntrySamples
        }, 'out');
    }
};

function normalizeHeader(header) {

    return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getField(row, name) {

    return row[normalizeHeader(name)];
}

function buildUserDataFromRow(row, adUserDataConsent, adPersonalizationConsent) {

    const email = getField(row, 'email');
    const phoneNumber = getField(row, 'phoneNumber') || getField(row, 'phone');
    const firstName = getField(row, 'firstName');
    const lastName = getField(row, 'lastName');
    const countryCode = getField(row, 'countryCode');
    const postalCode = getField(row, 'postalCode');
    const mobileId = getField(row, 'mobileId');
    const thirdPartyUserId = getField(row, 'thirdPartyUserId');

    const userIdentifiers = [];

    if (email) {
        userIdentifiers.push({ hashedEmail: lib.hashSha256(email) });
    }

    if (phoneNumber) {
        const normalizedPhone = String(phoneNumber).replace(/[^0-9+]/g, '').toLowerCase();
        if (normalizedPhone) {
            userIdentifiers.push({ hashedPhoneNumber: lib.hashSha256(normalizedPhone) });
        }
    }

    if (firstName && lastName && countryCode) {
        const addressInfo = {
            hashedFirstName: lib.hashSha256(firstName),
            hashedLastName: lib.hashSha256(lastName),
            countryCode: String(countryCode).trim().toUpperCase()
        };
        if (postalCode) {
            addressInfo.postalCode = String(postalCode).trim();
        }
        userIdentifiers.push({ addressInfo });
    }

    if (mobileId) {
        userIdentifiers.push({ mobileId: String(mobileId).trim() });
    }

    if (thirdPartyUserId) {
        userIdentifiers.push({ thirdPartyUserId: String(thirdPartyUserId).trim() });
    }

    if (userIdentifiers.length === 0) {
        return null;
    }

    const userData = { userIdentifiers };
    if (adUserDataConsent || adPersonalizationConsent) {
        userData.consent = {};
        if (adUserDataConsent) {
            userData.consent.adUserData = adUserDataConsent;
        }
        if (adPersonalizationConsent) {
            userData.consent.adPersonalization = adPersonalizationConsent;
        }
    }

    return userData;
}

function uploadBatch(context, {
    normalizedCustomerId,
    developerToken,
    loginCustomerId,
    userListResourceName,
    operations
}) {

    return context.httpRequest({
        method: 'POST',
        url: `${lib.API_BASE_URL}/customers/${normalizedCustomerId}:uploadUserData`,
        headers: lib.buildHeaders(context, { developerToken, loginCustomerId }),
        data: {
            customerMatchUserListMetadata: {
                userList: userListResourceName
            },
            operations
        }
    });
}

function splitCsvLine(line, delimiter) {

    const values = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const character = line[i];

        if (character === '"') {
            const escapedQuote = inQuotes && line[i + 1] === '"';
            if (escapedQuote) {
                value += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (character === delimiter && !inQuotes) {
            values.push(value.trim());
            value = '';
            continue;
        }

        value += character;
    }

    values.push(value.trim());
    return values;
}

function mapRow(headers, values) {

    return headers.reduce((row, header, index) => {
        row[header] = values[index];
        return row;
    }, {});
}

function parseIntegerOption(value, fallback) {

    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function parseNumberOption(value, fallback) {

    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}
