'use strict';
const Hubspot = require('../../Hubspot');

module.exports = {

    async receive(context) {

        const {
            name,
            domain,
            description,
            phone,
            address,
            city,
            state,
            zip,
            country,
            industry,
            website
        } = context.messages.in.content;

        const { auth } = context;
        const hs = new Hubspot(auth.accessToken, context.config);

        const additionalPropertiesArray = context.messages.in.content.additionalProperties?.AND || [];
        const additionalProperties = additionalPropertiesArray.reduce((acc, field) => {
            acc[field.name] = field.value;
            return acc;
        }, {});

        const payload = {
            properties: {
                name,
                domain: domain || '',
                description: description || '',
                phone: phone || '',
                address: address || '',
                city: city || '',
                state: state || '',
                zip: zip || '',
                country: country || '',
                industry: industry || '',
                website: website || '',
                ...additionalProperties
            }
        };
        
        const { data } = await hs.call('post', 'crm/v3/objects/companies', payload);
        const { properties } = data;

        return context.sendJson({
            id: data.id,
            name: properties.name || '',
            domain: properties.domain || '',
            description: properties.description || '',
            phone: properties.phone || '',
            address: properties.address || '',
            city: properties.city || '',
            state: properties.state || '',
            zip: properties.zip || '',
            country: properties.country || '',
            industry: properties.industry || '',
            website: properties.website || '',
            ...additionalProperties
        }, 'company');
    }
};