# Better Stack Connector

This connector integrates with Better Stack's Uptime API to monitor websites, servers, and applications.

## Overview

Better Stack is an all-in-one monitoring solution for your websites, servers, and applications. Monitor uptime, performance, and logs from a single platform.

## Authentication

This connector uses API key authentication. You can obtain an API token from:
- Go to [Better Stack → API tokens](https://betterstack.com/settings/api-tokens)
- Copy an existing token or create a new one in the **Uptime API tokens** section

## Components

### Monitor Components (CRUD)

#### CreateMonitor
Create a new monitor in Better Stack Uptime. Monitor websites, APIs, ports, and more.

**Inputs:**
- `url` (required): The URL to monitor
- `monitor_type`: Type of monitor (status, keyword, ping, port, heartbeat)
- `pronounceable_name`: Human-readable name for the monitor
- `check_frequency`: How often to check the monitor in seconds (minimum 30)
- `call`: Enable phone call notifications
- `sms`: Enable SMS notifications
- `email`: Enable email notifications
- `push`: Enable push notifications

**Output:** Monitor details including ID, URL, status, and timestamps

#### GetMonitor
Retrieve a specific monitor by its ID.

**Inputs:**
- `monitorId` (required): The unique identifier of the monitor

**Output:** Complete monitor details

#### UpdateMonitor
Update an existing monitor's configuration.

**Inputs:**
- `monitorId` (required): The unique identifier of the monitor to update
- `url`: The URL to monitor
- `pronounceable_name`: Human-readable name
- `check_frequency`: Check interval in seconds
- `call`, `sms`, `email`, `push`: Notification preferences
- `paused`: Pause or resume the monitor

**Output:** Empty object on success

#### DeleteMonitor
Delete a monitor from Better Stack Uptime.

**Inputs:**
- `monitorId` (required): The unique identifier of the monitor to delete

**Output:** Empty object on success

#### ListMonitors
List all monitors from Better Stack Uptime. Returns a maximum of 100 monitors per request.

**Inputs:**
- `outputType`: Choose output format (first, array, object, file)

**Output:** List of monitors with support for multiple output formats

### Incident Components

#### GetIncident
Retrieve a specific incident by its ID.

**Inputs:**
- `incidentId` (required): The unique identifier of the incident

**Output:** Incident details including name, cause, timestamps

#### ListIncidents
List all incidents from Better Stack Uptime. Returns a maximum of 100 incidents per request.

**Inputs:**
- `outputType`: Choose output format (first, array, object, file)

**Output:** List of incidents with support for multiple output formats

#### UpdateIncident
Update an incident (e.g., acknowledge or resolve).

**Inputs:**
- `incidentId` (required): The unique identifier of the incident
- `requester_email`: Email address of the person acknowledging the incident

**Output:** Empty object on success

### Heartbeat Components

#### CreateHeartbeat
Create a heartbeat ping to Better Stack Uptime for push-based monitoring.

**Inputs:**
- `monitorId` (required): The unique identifier of the heartbeat monitor to ping

**Output:** Status message confirming the heartbeat was sent

#### ListHeartbeats
List heartbeats for a specific monitor. Returns a maximum of 100 heartbeats per request.

**Inputs:**
- `monitorId` (required): The unique identifier of the monitor
- `outputType`: Choose output format (first, array, object, file)

**Output:** List of heartbeats with timestamps and status

## Rate Limiting

The connector implements conservative rate limiting to prevent API abuse:
- General API requests: 100 requests per minute
- Monitor creation: 10 requests per minute
- Heartbeat creation: 500 requests per minute

## Testing

The connector includes comprehensive unit tests for all components:

```bash
npm run test-unit -- src/appmixer/betterstack/artifacts/test/*.test.js
```

All 19 tests pass successfully.

## API Reference

For more information about the Better Stack API, visit:
- [Better Stack Uptime API Documentation](https://betterstack.com/docs/uptime/api/)
- [Getting Started with Uptime API](https://betterstack.com/docs/uptime/api/getting-started-with-uptime-api/)

## Module Structure

Components are organized in the `uptime` module instead of the default `core` module to align with Better Stack's product structure.

```
betterstack/
├── auth.js
├── bundle.json
├── service.json
├── quota.js
├── lib.js
├── artifacts/
│   └── test/
│       └── [test files]
└── uptime/
    ├── CreateMonitor/
    ├── GetMonitor/
    ├── UpdateMonitor/
    ├── DeleteMonitor/
    ├── ListMonitors/
    ├── GetIncident/
    ├── ListIncidents/
    ├── UpdateIncident/
    ├── CreateHeartbeat/
    └── ListHeartbeats/
```
