# Permissions Protocol

## Before ANY tool call:
1. Check if the action level (L1/L2/L3) requires user approval
2. L2 actions MUST show toast notification with 30s timeout
3. L3 actions MUST get explicit confirmation before execution

## Blocked actions (NEVER auto-execute):
- Deleting more than 5 pages at once
- Sending emails
- Posting to external services
- Modifying billing/subscription state
- Clearing entire Brain/database

## Rate limits:
- delete_page: max 10 per minute
- dream_cycle: max 1 per 10 minutes
- sync_brain: max 2 per 5 minutes
- query (hybrid search): max 30 per minute
