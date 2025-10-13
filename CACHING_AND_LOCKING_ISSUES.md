# Caching and Locking Issues Analysis

## Overview

This document identifies components that might have similar concurrency issues as the one fixed in [PR #818](https://github.com/Appmixer-ai/appmixer-connectors/pull/818).

## The Problem

### Context from PR #818

The Monday.com `ListBoards` component had a race condition issue:
- Multiple concurrent requests would check the cache
- If cache was empty, ALL requests would make API calls
- This resulted in redundant API calls instead of one request serving all

### The Fix

The fix involved wrapping the cache check and API call in a lock:

```javascript
let lock;
try {
    lock = await context.lock(cacheKey);
    
    // Check cache inside the lock
    const cached = await context.staticCache.get(cacheKey);
    if (cached) {
        return context.sendJson({ items: cached }, 'out');
    }
    
    // Make API call if cache miss
    const data = await fetchData();
    
    // Set cache
    await context.staticCache.set(cacheKey, data, ttl);
    
    return context.sendJson({ items: data }, 'out');
} finally {
    lock?.unlock();
}
```

## Issue Categories

> **Note:** Components can be used as sources in two ways:
> 1. By checking `context.messages.in.content.isSource` - used when called from another component's inspector
> 2. By checking `context.properties.variableFetch` - used when called from variable/dropdown fields
> 
> Both serve the same purpose: to provide data for dropdowns in the UI. Components checking either flag are subject to the same concurrency issues.

### Category 1: Components with Caching but NO Lock

These components have the same issue as the original `ListBoards` - they use caching but don't acquire a lock before checking/setting cache, leading to potential race conditions.

#### 1. Zoho CRM - ListFields

**File:** `src/appmixer/zoho/crm/ListFields/ListFields.js`

**Current Implementation:**
```javascript
async receive(context) {
    const { moduleName, filterApiName } = context.messages.in.content;
    let fields = await context.staticCache.get(moduleName);
    if (!fields) {
        fields = await (new ZohoClient(context)).getFields(moduleName);
        await context.staticCache.set(moduleName, fields, context?.config?.listFieldsCacheTTL || 600000);
    }
    if (filterApiName) {
        fields = fields.filter(({ api_name }) => api_name === filterApiName);
    }
    return context.sendJson(fields, 'fields');
}
```

**Issue:**
- Cache check and set are not protected by a lock
- Multiple concurrent requests for the same module will all make API calls if cache is empty

**Used as Source By:**
- `src/appmixer/zoho/crm/ContactCreated/component.json`
- `src/appmixer/zoho/crm/FindContact/component.json`
- `src/appmixer/zoho/crm/FindLead/component.json`
- `src/appmixer/zoho/crm/CreateContact/component.json`
- `src/appmixer/zoho/crm/ContactUpdated/component.json`
- `src/appmixer/zoho/crm/LeadUpdated/component.json`
- `src/appmixer/zoho/crm/CreateLead/component.json`
- `src/appmixer/zoho/crm/LeadCreated/component.json`
- `src/appmixer/zoho/crm/UpdateContact/component.json`
- `src/appmixer/zoho/crm/UpdateLead/component.json`

**Recommended Fix:**
```javascript
async receive(context) {
    const { moduleName, filterApiName } = context.messages.in.content;
    
    let lock;
    try {
        lock = await context.lock(moduleName);
        
        let fields = await context.staticCache.get(moduleName);
        if (!fields) {
            fields = await (new ZohoClient(context)).getFields(moduleName);
            await context.staticCache.set(moduleName, fields, context?.config?.listFieldsCacheTTL || 600000);
        }
        
        if (filterApiName) {
            fields = fields.filter(({ api_name }) => api_name === filterApiName);
        }
        return context.sendJson(fields, 'fields');
    } finally {
        lock?.unlock();
    }
}
```

### Category 2: Components WITHOUT Caching or Lock (Used as Sources)

These components are used as sources by other components but don't implement any caching mechanism. While they don't have race conditions, they could benefit from adding caching with proper locking to reduce redundant API calls.

#### 2. Square - ListCustomerGroups

**File:** `src/appmixer/square/core/ListCustomerGroups/ListCustomerGroups.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag
- Makes API call on every request

**Impact:**
- Multiple concurrent requests will all make API calls
- No optimization for repeated calls

**Recommended Enhancement:**
Add caching with lock similar to other list components:
```javascript
async receive(context) {
    const outputType = context.messages.in.content.outputType || 'array';
    const isSource = context.messages.in.content.isSource;

    if (context.properties.generateOutputPortOptions) {
        return lib.getOutputPortOptions(context, outputType, schema, { label: 'Groups' });
    }

    const cacheKey = 'square_customer_groups_' + context.auth.accessToken.slice(-10);
    let lock;
    
    try {
        lock = await context.lock(context.auth.accessToken.slice(-10));
        
        // Check cache only if used as source
        if (isSource) {
            const cached = await context.staticCache.get(cacheKey);
            if (cached) {
                return context.sendJson(cached, 'out');
            }
        }
        
        // Make API call
        const environment = context.config.environment || 'production';
        const baseUrl = environment === 'production'
            ? 'https://connect.squareup.com'
            : 'https://connect.squareupsandbox.com';

        const { data } = await context.httpRequest({
            method: 'GET',
            url: `${baseUrl}/v2/customers/groups`,
            headers: {
                'Authorization': `Bearer ${context.auth.accessToken}`,
                'Square-Version': '2025-08-20'
            }
        });

        let records = data.groups || [];
        
        // Cache for source calls
        if (isSource) {
            await context.staticCache.set(
                cacheKey,
                records.map(g => ({ id: g.id, name: g.name })),
                context.config.listCustomerGroupsCacheTTL || (20 * 1000)
            );
        }

        if (isSource) {
            return context.sendJson(records, 'out');
        }
        return lib.sendArrayOutput({ context, records, outputType });
    } finally {
        lock?.unlock();
    }
}
```

#### 3. Trello - ListBoardsList

**File:** `src/appmixer/trello/list/ListBoardsList/ListBoardsList.js`

**Current Implementation:**
- No caching
- No locking  
- Checks `isSource` flag
- Makes API call on every request

**Used as Source By:**
Components that reference boards' lists in their inspectors

**Recommended Enhancement:**
Similar to Square component - add caching with lock for `isSource` calls.

#### 4. Trello - ListBoardsCards

**File:** `src/appmixer/trello/list/ListBoardsCards/ListBoardsCards.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag
- Already has optimization to skip API call if `boardId` is missing or an Appmixer variable

**Note:** This component already has some optimization logic, but could still benefit from caching for repeated calls with the same valid `boardId`.

#### 5. Trello - ListBoardLabels

**File:** `src/appmixer/trello/list/ListBoardLabels/ListBoardLabels.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag
- Makes API call on every request

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 6. Trello - ListCardChecklists

**File:** `src/appmixer/trello/checklist/ListCardChecklists/ListCardChecklists.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 7. Trello - ListChecklistItems

**File:** `src/appmixer/trello/checklist/ListChecklistItems/ListChecklistItems.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 8. Akamai - GetLists

**File:** `src/appmixer/akamai/clientlist/GetLists/GetLists.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 9. Akamai - GetListEntries

**File:** `src/appmixer/akamai/clientlist/GetListEntries/GetListEntries.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 10. HubSpot - ListPipelineStages

**File:** `src/appmixer/hubspot/crm/ListPipelineStages/ListPipelineStages.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 11. Kit - FindForms

**File:** `src/appmixer/kit/form/FindForms/FindForms.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 12. Kit - ListSequences

**File:** `src/appmixer/kit/sequence/ListSequences/ListSequences.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 13. Kit - FindSubscribers

**File:** `src/appmixer/kit/subscriber/FindSubscribers/FindSubscribers.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 14. Kit - ListTags

**File:** `src/appmixer/kit/tag/ListTags/ListTags.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 15. Klaviyo - FindLists

**File:** `src/appmixer/klaviyo/list/FindLists/FindLists.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 16. Klaviyo - FindMetrics

**File:** `src/appmixer/klaviyo/metric/FindMetrics/FindMetrics.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 17. Klaviyo - FindProfiles

**File:** `src/appmixer/klaviyo/profile/FindProfiles/FindProfiles.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 18. Klaviyo - FindSegments

**File:** `src/appmixer/klaviyo/segment/FindSegments/FindSegments.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

#### 19. Pipedrive - ListPeople

**File:** `src/appmixer/pipedrive/crm/ListPeople/ListPeople.js`

**Current Implementation:**
- No caching
- No locking
- Checks `isSource` flag

**Recommended Enhancement:**
Add caching with lock for `isSource` calls.

### Category 3: Components Using `variableFetch` WITHOUT Caching or Lock

These components use the `variableFetch` property instead of `isSource`, but serve the same purpose - they provide data for dropdowns in the UI. Like Category 2 components, they don't have race conditions but could benefit from caching.

#### 20. Microsoft OneDrive - ListGroups

**File:** `src/appmixer/microsoft/onedrive/ListGroups/ListGroups.js`

**Current Implementation:**
```javascript
async receive(context) {
    try {
        const groups = await listItems(context, 'groups?');
        return context.sendJson({ groups }, 'out');
    } catch (err) {
        if (context.properties.variableFetch) {
            return context.sendJson({ groups: [] }, 'out');
        }
        context.log({ stage: 'Error', err });
        throw new Error(err);
    }
}
```

**Issue:**
- No caching
- No locking
- Uses `variableFetch` flag for error handling

**Used as Source By:**
- `src/appmixer/microsoft/onedrive/ListFiles/component.json`
- `src/appmixer/microsoft/onedrive/MoveFileOrFolder/component.json`

**Recommended Enhancement:**
Add caching with lock similar to other list components, checking `variableFetch` flag.

#### 21. Microsoft OneDrive - ListSites

**File:** `src/appmixer/microsoft/onedrive/ListSites/ListSites.js`

**Current Implementation:**
```javascript
async receive(context) {
    try {
        const sites = await listItems(context, 'sites?search=&');
        return context.sendJson({ sites }, 'out');
    } catch (err) {
        if (context.properties.variableFetch) {
            return context.sendJson({ sites: [] }, 'out');
        }
        context.log({ stage: 'Error', err });
        throw new Error(err);
    }
}
```

**Issue:**
- No caching
- No locking
- Uses `variableFetch` flag for error handling

**Used as Source By:**
- `src/appmixer/microsoft/onedrive/ListFiles/component.json`
- `src/appmixer/microsoft/onedrive/MoveFileOrFolder/component.json`

**Recommended Enhancement:**
Add caching with lock for `variableFetch` calls.

#### 22. Microsoft OneDrive - ListUsers

**File:** `src/appmixer/microsoft/onedrive/ListUsers/ListUsers.js`

**Current Implementation:**
```javascript
async receive(context) {
    try {
        const users = await listItems(context, 'users?');
        return context.sendJson({ users }, 'out');
    } catch (err) {
        if (context.properties.variableFetch) {
            return context.sendJson({ users: [] }, 'out');
        }
        context.log({ stage: 'Error', err });
        throw new Error(err);
    }
}
```

**Issue:**
- No caching
- No locking
- Uses `variableFetch` flag for error handling

**Used as Source By:**
- `src/appmixer/microsoft/onedrive/ListFiles/component.json`
- `src/appmixer/microsoft/onedrive/MoveFileOrFolder/component.json`

**Recommended Enhancement:**
Add caching with lock for `variableFetch` calls.

#### 23. Microsoft OneDrive - ListDrives

**File:** `src/appmixer/microsoft/onedrive/ListDrives/ListDrives.js`

**Current Implementation:**
```javascript
async receive(context) {
    try {
        const drives = await listItems(context, 'me/drives?');
        return context.sendJson({ drives }, 'out');
    } catch (err) {
        if (context.properties.variableFetch) {
            return context.sendJson({ drives: [] }, 'out');
        }
        context.log({ stage: 'Error', err });
        throw new Error(err);
    }
}
```

**Issue:**
- No caching
- No locking
- Uses `variableFetch` flag for error handling

**Used as Source By:**
- `src/appmixer/microsoft/onedrive/ListFiles/component.json`
- `src/appmixer/microsoft/onedrive/MoveFileOrFolder/component.json`
- `src/appmixer/microsoft/onedrive/CreateFolder/component.json`

**Recommended Enhancement:**
Add caching with lock for `variableFetch` calls.

#### 24. Google Analytics - ListPropertiesMetadata

**File:** `src/appmixer/google/analytics/ListPropertiesMetadata/ListPropertiesMetadata.js`

**Current Implementation:**
```javascript
async receive(context) {
    try {
        const { propertyId } = context.properties;

        const { data } = await context.httpRequest({
            method: 'GET',
            url: `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`,
            headers: {
                'Authorization': `Bearer ${context.auth.accessToken}`
            }
        });

        return context.sendJson(data, 'out');
    } catch (error) {
        if (context.properties.variableFetch) {
            return context.sendJson({ dimensions: [], metrics: [] }, 'out');
        }
        context.log({ stage: 'Error', err });
        throw new Error('Property ID must be filled');
    }
}
```

**Issue:**
- No caching
- No locking
- Uses `variableFetch` flag for error handling

**Used as Source By:**
- `src/appmixer/google/analytics/GenerateReport/component.json`

**Recommended Enhancement:**
Add caching with lock for `variableFetch` calls, using `propertyId` as part of the cache key.

## Components Already Fixed

These components already have proper locking mechanisms and serve as good reference implementations:

1. **Monday.com - ListBoards** (Fixed in PR #818)
   - `src/appmixer/monday/core/ListBoards/ListBoards.js`
   
2. **Airtable - ListBases** ✅
   - `src/appmixer/airtable/records/ListBases/ListBases.js`
   
3. **Airtable - ListTables** ✅
   - `src/appmixer/airtable/records/ListTables/ListTables.js`
   
4. **Discord - ListChannels** ✅
   - `src/appmixer/discord/core/ListChannels/ListChannels.js`
   
5. **Slack - ListUsers** ✅
   - `src/appmixer/slack/list/ListUsers/ListUsers.js`
   
6. **Claude AI - ListModels** ✅
   - `src/appmixer/ai/claude/ListModels/ListModels.js`
   
7. **Resend - ListAudiences** ✅
   - `src/appmixer/resend/core/ListAudiences/ListAudiences.js`
   
8. **CurrencyLayer - ListAllCurrencies** ✅
   - `src/appmixer/currencylayer/core/ListAllCurrencies/ListAllCurrencies.js`
   
9. **Salesforce - ListObjects** ✅
   - `src/appmixer/salesforce/crm/ListObjects/ListObjects.js`
   
10. **Microsoft Dynamics - ListLookupOptions** ✅
    - `src/appmixer/microsoft/dynamics/ListLookupOptions/ListLookupOptions.js`
    
11. **Naxai - GetAttributes** ✅
    - `src/appmixer/naxai/people/GetAttributes/GetAttributes.js`

## Summary

### Critical Issues (Must Fix)
1. **Zoho CRM - ListFields**: Has caching without lock - same issue as original PR #818

### Enhancement Opportunities (Should Consider)

#### Components checking `isSource` without caching (Category 2)
19 components that check `isSource` but don't use caching:
- Square - ListCustomerGroups
- Trello components (5 components)
- Akamai components (2 components)
- HubSpot - ListPipelineStages
- Kit components (4 components)
- Klaviyo components (4 components)
- Pipedrive - ListPeople

#### Components checking `variableFetch` without caching (Category 3)
5 components that check `variableFetch` but don't use caching:
- Microsoft OneDrive - ListGroups
- Microsoft OneDrive - ListSites
- Microsoft OneDrive - ListUsers
- Microsoft OneDrive - ListDrives
- Google Analytics - ListPropertiesMetadata

**Total:** 24 components could benefit from adding caching with proper locking to reduce API calls when used as sources.

These don't have race conditions, but could benefit from caching to reduce API calls when used as sources.

## Recommended Action Plan

### Priority 1: Fix Race Conditions
1. Fix `src/appmixer/zoho/crm/ListFields/ListFields.js`
   - Add lock mechanism similar to PR #818
   - Add test similar to the test in PR #818

### Priority 2: Add Caching for Frequently Used Sources

#### High Priority (used by multiple components)
1. **Microsoft OneDrive components** (Category 3 - using `variableFetch`)
   - ListDrives (used by 3 components)
   - ListGroups, ListSites, ListUsers (each used by 2 components)
   
2. **Trello components** (Category 2 - using `isSource`)
   - Used by multiple other Trello components

3. **Kit components** (Category 2 - using `isSource`)
   - Used in form builders, sequences, etc.

#### Medium Priority
4. Klaviyo components (used in marketing automation flows)
5. Google Analytics - ListPropertiesMetadata (used by GenerateReport)

#### Lower Priority
6. Square, Akamai, HubSpot, Pipedrive components

### Priority 3: Standardize Pattern
Create a shared utility or documentation for the standard pattern that works for both `isSource` and `variableFetch`:

```javascript
async function withCacheLock(context, cacheKey, lockKey, fetchFn, ttl) {
    // Check if this is being called as a source
    const isSource = context.messages?.in?.content?.isSource || context.properties?.variableFetch;
    
    let lock;
    try {
        lock = await context.lock(lockKey);
        
        if (isSource) {
            const cached = await context.staticCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        
        const data = await fetchFn();
        
        if (isSource) {
            await context.staticCache.set(cacheKey, data, ttl);
        }
        
        return data;
    } finally {
        lock?.unlock();
    }
}
```

## Testing Recommendations

For each fix:
1. Add concurrency test similar to the one in PR #818
2. Test with multiple simultaneous requests
3. Verify only one API call is made when cache is empty
4. Verify cache hit scenario works correctly
5. Verify lock is always released (even on errors)
