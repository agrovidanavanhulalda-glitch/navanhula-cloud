---
name: Master Control System
description: NAVANHULA GROUP SA as master company with branch/client hierarchy, is_system_owner bypass, get_master_visible_company_ids RPC
type: feature
---
The companies table has `company_type` (master/branch/client), `is_system_owner`, `billing_exempt`, `parent_company_id`.

- **MASTER** (NAVANHULA GROUP SA): is_system_owner=true, billing_exempt=true, sees ALL companies
- **BRANCH**: parent_company_id points to MASTER, billing_exempt=true, inherits elevated permissions
- **CLIENT**: External paying customers, billing_exempt=false, isolated data

Helper functions:
- `is_master_company_user(uuid)` — checks if user belongs to master company
- `get_master_visible_company_ids(uuid)` — returns all company IDs visible to user (all for master, own for others)

All operational data was truncated in the global reset. System starts clean.
