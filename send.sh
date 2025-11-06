#!/bin/bash
#
# CLI script to send messages to users via WebSocket Demo backend
# Usage: ./send.sh <USER_GUID> "Message text"
#

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

HOST=${HOST:-example.local}
BACKEND_PORT=${BACKEND_PORT:-9001}
BACKEND_URL="http://${HOST}:${BACKEND_PORT}"

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <USER_GUID> \"Message text\"" >&2
    echo "" >&2
    echo "Example:" >&2
    echo "  $0 123e4567-e89b-12d3-a456-426614174000 \"Hello, World!\"" >&2
    exit 1
fi

USER_GUID="$1"
MESSAGE_TEXT="$2"

# Validate GUID format
GUID_REGEX='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
if ! [[ "$USER_GUID" =~ $GUID_REGEX ]]; then
    echo "Error: Invalid GUID format" >&2
    echo "GUID must match format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" >&2
    echo "Example: 123e4567-e89b-12d3-a456-426614174000" >&2
    exit 1
fi

# Send message
echo "Sending message to user $USER_GUID..."
echo "Backend: $BACKEND_URL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/enqueue" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"${USER_GUID}\",\"text\":\"${MESSAGE_TEXT}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 202 ]; then
    echo "✓ Message sent successfully"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 0
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "✗ Error: Invalid request" >&2
    echo "$BODY" | jq -r '.message' 2>/dev/null || echo "$BODY" >&2
    exit 1
else
    echo "✗ Error: HTTP $HTTP_CODE" >&2
    echo "$BODY" >&2
    exit 1
fi

