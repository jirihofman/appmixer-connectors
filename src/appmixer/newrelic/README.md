# NewRelic Connector

This connector provides integration with the NewRelic REST API v2 for monitoring and observability.

## Authentication

The connector uses API Key authentication. To obtain your API key:

1. Log into your New Relic account
2. Navigate to Account Settings > API Keys
3. Create or copy an API Key

### Region Selection

The connector supports both Global and EU regions:
- **Global (default)**: Uses `https://api.newrelic.com`
- **EU**: Uses `https://api.eu.newrelic.com`

Select the appropriate region when configuring authentication based on your New Relic account location.

## Components

### Applications

- **ListApplications** - List all applications in your New Relic account (up to 200)
- **GetApplication** - Get details of a specific application by ID
- **DeleteApplication** - Delete an application from New Relic

### Application Hosts

- **ListApplicationHosts** - List all hosts associated with a specific application (up to 200)

### Servers

- **ListServers** - List all servers in your New Relic account (up to 200)
- **GetServer** - Get details of a specific server by ID

### Alert Policies

- **ListAlertPolicies** - List all alert policies (up to 200)
- **CreateAlertPolicy** - Create a new alert policy with configurable incident preferences

### Deployments

- **ListDeployments** - List deployments for a specific application (up to 200)
- **CreateDeployment** - Record a new deployment with revision, changelog, and description

### Users

- **ListUsers** - List all users in your New Relic account (up to 200)
- **GetUser** - Get details of a specific user by ID

## API Rate Limits

The connector implements rate limiting of 1000 requests per minute per user, in accordance with NewRelic API v2 limits.

## Output Types

List components support multiple output types:
- **Array** - Returns all items in a single array
- **Object** - Returns items one at a time
- **First** - Returns only the first item
- **File** - Exports results to a CSV file

## References

- [NewRelic REST API v2 Documentation](https://docs.newrelic.com/docs/apis/rest-api-v2/get-started/introduction-new-relic-rest-api-v2/)
- [NewRelic API Explorer](https://rpm.newrelic.com/api/explore)
