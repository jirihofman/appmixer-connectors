const axios = require('axios');

module.exports = async (options) => {
    try {
        const response = await axios(options);
        return response;
    } catch (error) {
        if (error.response) {
            // Server responded with error status
            const err = new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            err.response = error.response;
            throw err;
        }
        // Network or other error
        throw error;
    }
};
