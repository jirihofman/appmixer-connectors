# Clockify Connector Context and Implementation Plan

## Service Overview

Clockify is a time tracking, project management, scheduling, expense, approval, and reporting platform. The connector should focus first on workflow automation around workspaces, clients, projects, tasks, and time entries.

Primary Appmixer use cases:
- Create projects, clients, tasks, and time entries from upstream workflow events.
- Sync tracked time to downstream reporting, billing, or data warehouse tools.
- React to new or changed time tracking events through Clockify webhooks.
- Retrieve workspace/project/task context for conditional workflow routing.

## Official Documentation

- API reference: https://docs.clockify.me/
- Developer API reference mirror: https://docs.developer.clockify.me/
- API and webhook settings help: https://clockify.me/help/administration/api-webhook-settings

## Authentication Research

### Recommended Authentication

- Type: API key.
- Header: `X-Api-Key: {apiKey}`.
- Alternative for marketplace/add-on apps: `X-Addon-Token: {addonToken}`.
- Validation endpoint: `GET https://api.clockify.me/api/v1/user?include-memberships=true`.
- Account label: use `email` from `GET /v1/user`; fallback to `name`.

Clockify public docs do not document a multitenant OAuth 2.0 flow for the REST API. Use API key auth for this connector unless Clockify provides a private marketplace/add-on OAuth flow later.

### How Users Obtain an API Key

Clockify Help Center path:
1. Open Clockify Profile settings.
2. Go to the Advanced tab.
3. Click Manage API keys.
4. Click Generate new.
5. Enter an API key name and generate the key.

Important: if the workspace uses a Clockify subdomain, Clockify says the user must generate an API key specifically for that workspace/subdomain.

### Auth Fields to Implement

- `apiKey` (required): Clockify API key.
- `apiBaseUrl` (optional, default `https://api.clockify.me/api/v1`): allows regional/subdomain APIs, e.g. `https://euc1.clockify.me/api/v1`.
- `reportBaseUrl` (optional, future, default `https://reports.api.clockify.me/v1`): only needed for report components.

## API Details

### Base URLs

- Global regular API: `https://api.clockify.me/api/v1`
- Global reports API: `https://reports.api.clockify.me/v1`
- Regional regular API examples: `https://euc1.clockify.me/api/v1`, `https://use2.clockify.me/api/v1`, `https://euw2.clockify.me/api/v1`, `https://apse2.clockify.me/api/v1`
- Regional/subdomain report URLs differ, so report components should stay out of phase 1 unless report URL configuration is added.

### Pagination

Clockify supports pagination for synchronous list `GET` endpoints. Relevant query parameters are page-based (`page`, plus endpoint-specific `page-size` or `pageSize`). Responses include a `Last-Page` header indicating when pagination is complete.

Implementation note: List/Find components should support Appmixer `outputType` and use `lib.sendArrayOutput()` / `lib.getOutputPortOptions()` per repo instructions.

### Rate Limits and Plans

- Help Center documents a Free plan API limit of 30 requests per hour per workspace.
- API docs document `X-Addon-Token` rate limiting of 50 requests per second per add-on per workspace.
- Webhooks are available on Free and paid plans, but only workspace owners/admins can manage webhook settings.

### Webhook Limits

- Free plan: up to 3 webhooks.
- Basic, Standard, Pro: up to 10 webhooks per user, 100 total per workspace.
- Enterprise: up to 100 webhooks per user, 300 total per workspace.

## API Surface Summary

Core resources available in the public REST API:
- User and Workspace: current user, workspace list/detail, workspace users.
- Webhooks: create/list/get/update/delete webhook configurations; event logs; rotate webhook token.
- Clients: list/create/get/update/delete clients.
- Projects: list/create/get/update/delete projects; memberships; rates; estimates; templates.
- Tasks: list/create/get/update/delete tasks within a project; rates.
- Tags: list/create/get/update/delete tags.
- Time entries: create/list/get/update/delete, stop running timer, duplicate, bulk operations, in-progress entries.
- Expenses and categories: list/create/get/update/delete/archive expenses and categories, receipt download.
- Invoices: list/create/get/update/delete, duplicate, status changes, items, payments, export.
- Reports: attendance, detailed, summary, weekly, expense, audit log.
- Scheduling, time off, approvals, groups, shared reports, custom fields, and experimental entity changes.

## Selected Endpoint Map

| Resource | Endpoint | Method | Docs |
| --- | --- | --- | --- |
| Current user | `/v1/user` | GET | https://docs.clockify.me/#tag/User/operation/getLoggedUser |
| Workspaces | `/v1/workspaces` | GET | https://docs.clockify.me/#tag/Workspace/operation/getWorkspacesOfUser |
| Clients | `/v1/workspaces/{workspaceId}/clients` | GET | https://docs.clockify.me/#tag/Client/operation/getClients |
| Create client | `/v1/workspaces/{workspaceId}/clients` | POST | https://docs.clockify.me/#tag/Client/operation/createClient |
| Projects | `/v1/workspaces/{workspaceId}/projects` | GET | https://docs.clockify.me/#tag/Project/operation/getProjects |
| Create project | `/v1/workspaces/{workspaceId}/projects` | POST | https://docs.clockify.me/#tag/Project/operation/createNewProject |
| Tasks | `/v1/workspaces/{workspaceId}/projects/{projectId}/tasks` | GET | https://docs.clockify.me/#tag/Task/operation/getTasks |
| Create task | `/v1/workspaces/{workspaceId}/projects/{projectId}/tasks` | POST | https://docs.clockify.me/#tag/Task/operation/createTask |
| Time entries | `/v1/workspaces/{workspaceId}/user/{userId}/time-entries` | GET | https://docs.clockify.me/#tag/Time-entry/operation/getTimeEntries |
| Create time entry | `/v1/workspaces/{workspaceId}/time-entries` | POST | https://docs.clockify.me/#tag/Time-entry/operation/createTimeEntry |
| Stop running timer | `/v1/workspaces/{workspaceId}/user/{userId}/time-entries` | PATCH | https://docs.clockify.me/#tag/Time-entry/operation/stopRunningTimeEntry |
| Create webhook | `/v1/workspaces/{workspaceId}/webhooks` | POST | https://docs.clockify.me/#tag/Webhooks/operation/createWebhook |

## Proposed Phase 1 Components

Maximum initial scope: 10 actions and 3 triggers.

### Actions

| Component | Type | Endpoint | Method | Notes |
| --- | --- | --- | --- | --- |
| `GetCurrentUser` | Get | `/v1/user` | GET | Include memberships option; useful for discovering active/default workspace and user ID. |
| `ListWorkspaces` | List | `/v1/workspaces` | GET | Use outputType. |
| `FindClients` | Find | `/v1/workspaces/{workspaceId}/clients` | GET | Filters should include `name`, `archived`, pagination where supported; include `notFound` port. |
| `CreateClient` | Create | `/v1/workspaces/{workspaceId}/clients` | POST | Required: `workspaceId`, `name`. |
| `FindProjects` | Find | `/v1/workspaces/{workspaceId}/projects` | GET | Filters should include client, name, archived/status if supported; use outputType and `notFound`. |
| `CreateProject` | Create | `/v1/workspaces/{workspaceId}/projects` | POST | Required: `workspaceId`, `name`; optional client, billable/rate, public/private settings. |
| `FindTasks` | Find | `/v1/workspaces/{workspaceId}/projects/{projectId}/tasks` | GET | Project-scoped tasks; use outputType and `notFound`. |
| `CreateTask` | Create | `/v1/workspaces/{workspaceId}/projects/{projectId}/tasks` | POST | Required: `workspaceId`, `projectId`, `name`. |
| `FindTimeEntries` | Find | `/v1/workspaces/{workspaceId}/user/{userId}/time-entries` | GET | Date range filters are essential; use outputType and `notFound`. |
| `CreateTimeEntry` | Create | `/v1/workspaces/{workspaceId}/time-entries` | POST | Manual time entry with start/end, project, task, tags, billable flag, description. |

### Triggers

| Component | Mechanism | Event | Notes |
| --- | --- | --- | --- |
| `NewTimeEntry` | Webhook | `NEW_TIME_ENTRY` | Preferred over polling if webhook setup is allowed by the authenticated user. |
| `TimeEntryUpdated` | Webhook | `TIME_ENTRY_UPDATED` | Covers edits to tracked time; include webhook token validation if Clockify sends token headers/body. |
| `TimerStopped` | Webhook | `TIMER_STOPPED` | Useful for downstream billing/reporting workflows. |

### Later Components

Good phase 2 candidates:
- `GetTimeEntry`, `UpdateTimeEntry`, `DeleteTimeEntry`, `StopRunningTimer`
- `GetProject`, `UpdateProject`, `DeleteProject`
- `GetClient`, `UpdateClient`, `DeleteClient`
- `ListTags`, `CreateTag`
- Report actions after `reportBaseUrl` handling is settled.

## Implementation Plan

1. Scaffold `src/appmixer/clockify` with `service.json`, `bundle.json`, `auth.js`, `lib.js`, `quota.js`, and component directories grouped by resource (`user`, `workspace`, `client`, `project`, `task`, `timeEntry`, `triggers`).
2. Implement `auth.js` as `type: 'apiKey'` with `apiKey` and optional base URL fields. Validate credentials with `GET /v1/user?include-memberships=true` and `X-Api-Key`.
3. Add `lib.js` helpers:
   - `request(context, options)` to prepend `apiBaseUrl`, inject `X-Api-Key`, normalize errors, and support absolute URLs.
   - `paginate(context, options)` to follow `Last-Page` and page parameters.
   - Required outputType helpers copied from the canonical Appmixer template.
4. Implement phase 1 actions in the order listed above. Start with `GetCurrentUser` and `ListWorkspaces` so component tests can discover IDs for E2E flows.
5. Use JSON Schema outPorts with realistic `example` values on leaf fields. Do not mix `schema` and `options` on one outPort.
6. For Find/List components, implement `outputType` support and `notFound` ports for Find components.
7. Implement webhook triggers only after confirming the Appmixer connector webhook route pattern to use in this repo. Triggers should create/delete Clockify webhooks in `start()`/`stop()` when possible and handle workspace plan/user permission errors clearly.
8. Add focused unit tests for each component with the repo Appmixer test stub. Add E2E flow artifacts later with required `BeforeAll`, `Assert`, `AfterAll`, and `ProcessE2EResults` steps per repo instructions.
9. Run `npm run validate` and relevant unit tests before opening the PR.

## Open Questions / Risks

- Clockify API key auth is user-managed, so the connector cannot silently provision credentials for users. The auth UI must explain the Profile settings path clearly.
- Regional and subdomain workspaces can require non-default API hosts. The connector should expose `apiBaseUrl` from the start to avoid locking users to the global endpoint.
- Webhook triggers require workspace owner/admin permissions and plan-based limits. If webhook creation fails due to permissions, consider polling fallbacks for `NewTimeEntry` and `TimeEntryUpdated`.
- Report endpoints use different base URLs than regular API endpoints. Keep report components out of phase 1 unless URL handling is explicitly designed.
