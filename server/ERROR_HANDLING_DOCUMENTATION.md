# WhatsApp Simulator - Error Handling Documentation

## Overview

This setup allows developers to test error scenarios without needing actual WhatsApp API failures.

---

## Error Configuration System

### Function: `getErrorForNumber(phoneNumber)`

**Location:** `router/v14.0/router/index.js` (Lines 95-135)

**Purpose:** Determines if a phone number should trigger a specific error response based on its prefix pattern.

**Function Signature:**

```javascript
function getErrorForNumber(phoneNumber) {
  // Returns error object or null
}
```

---

---

## Configured Test Scenarios

The system supports various test scenarios triggered by phone number prefixes.

### Error Scenarios

#### 1. Re-engagement Message Error (Prefix: `911441`)

**Error Code:** `131047`

**Trigger:** Any phone number starting with `911441`

**Response:**

```json
{
  "code": 131047,
  "message": "Re-engagement message",
  "title": "Re-engagement message",
  "error_data": {
    "details": "Message failed to send because more than 24 hours have passed since the customer last replied to this number."
  },
  "href": "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/"
}
```

**Use Case:** Test scenarios where messages cannot be sent due to conversation window expiration.

---

#### 2. Ecosystem Engagement Error (Prefix: `911442`)

**Error Code:** `131049`

**Trigger:** Any phone number starting with `911442`

**Response:**

```json
{
  "code": 131049,
  "message": "This message was not delivered to maintain healthy ecosystem engagement.",
  "title": "This message was not delivered to maintain healthy ecosystem engagement.",
  "error_data": {
    "details": "In order to maintain a healthy ecosystem engagement, the message failed to be delivered."
  },
  "href": "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/"
}
```

**Use Case:** Test rate limiting and ecosystem health checks.

---

#### 3. Message Undeliverable Error (Prefix: `911443`)

**Error Code:** `131026`

**Trigger:** Any phone number starting with `911443`

**Response:**

```json
{
  "code": 131026,
  "message": "Message undeliverable",
  "title": "Message undeliverable",
  "error_data": {
    "details": "Message Undeliverable."
  },
  "href": "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/"
}
```

**Use Case:** Test general message delivery failures.

---

#### 4. Experiment Participation Error (Prefix: `911444`)

**Error Code:** `130472`

**Trigger:** Any phone number starting with `911444`

**Response:**

```json
{
  "code": 130472,
  "message": "User's number is part of an experiment",
  "title": "User's number is part of an experiment",
  "error_data": {
    "details": "Failed to send message because this user's phone number is part of an experiment"
  },
  "href": "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/"
}
```

**Use Case:** Test A/B testing and experiment scenarios.

---

### Status Delay Scenarios (Positive Flows)

These scenarios test the successful delivery and reading of messages with artificial delays to verify webhook and socket event handling.

#### 5. Sent Only (Prefix: `911445`)

**Trigger:** Any phone number starting with `911445`

**Behavior:** The message will remain in `sent` status. No further status updates (`delivered` or `read`) will be triggered automatically.

**Use Case:** Test basic message sending without delivery confirmation.

---

#### 6. Sent to Delivered Delay (Prefix: `911446`)

**Trigger:** Any phone number starting with `911446`

**Behavior:**

1.  **Immediate:** Message marked as `sent`.
2.  **After 1 second:** Webhook and socket event sent for `delivered` status.

**Use Case:** Test handling of `delivered` status updates.

---

#### 7. Sent to Delivered to Read Delay (Prefix: `911447`)

**Trigger:** Any phone number starting with `911447`

**Behavior:**

1.  **Immediate:** Message marked as `sent`.
2.  **After 1 second:** Webhook and socket event sent for `delivered` status.
3.  **After 2 seconds (cumulative):** Webhook and socket event sent for `read` status.

**Use Case:** Test full message lifecycle status updates.

---

## Implementation Details

### Where Errors Are Applied

The error handling is integrated into two message endpoints:

1. **POST `/:dynamic_value/messages`** - Regular messages
2. **POST `/:dynamic_value/marketing_messages`** - Marketing messages

### Error Response Flow

When a message is sent to a configured error number:

1. **Check Phase:** The `getErrorForNumber()` function checks the recipient phone number
2. **Error Detection:** If a match is found, an error object is returned
3. **Webhook Trigger:** A failed webhook is sent to the configured webhook URL
4. **Response:** The API returns an error response with the message marked as failed

### Error Response Structure

```javascript
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "<phone_number>",
      "wa_id": "<phone_number>"
    }
  ],
  "messages": [
    {
      "id": "<message_id>",
      "message_status": "failed",
      "errors": [
        {
          "code": <error_code>,
          "message": "<error_message>",
          "title": "<error_title>",
          "error_data": {
            "details": "<error_details>"
          },
          "href": "<documentation_link>"
        }
      ]
    }
  ]
}
```

### Failed Webhook Payload

When an error occurs, a webhook is sent with the following structure:

```javascript
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<wba_id>",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "<phone_number_id>",
              "phone_number_id": "<phone_number_id>"
            },
            "statuses": [
              {
                "id": "<message_id>",
                "status": "failed",
                "timestamp": "<unix_timestamp>",
                "recipient_id": "<recipient_phone>",
                "errors": [
                  {
                    "code": <error_code>,
                    "message": "<error_message>",
                    "title": "<error_title>",
                    "error_data": {
                      "details": "<error_details>"
                    },
                    "href": "<documentation_link>"
                  }
                ]
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

---

## Postman Testing Instructions

### Prerequisites

- Server running on `http://localhost:3000`
- Valid Bearer token (Base64 encoded user data)

### Step 1: Generate Bearer Token

Create a Base64 encoded token with your credentials:

```javascript
// Example user data
{
  "app_id": "14000000001",
  "wba_id": "1100000000001",
  "phone_number_id": "1200000000001"
}

// Base64 encode this JSON
// Result: eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==
```

### Step 2: Create Postman Collection

#### Test 1: Send Message to Re-engagement Error Number

**Request:**

```
POST http://localhost:3000/v14.0/1200000000001/messages
```

**Headers:**

```
Authorization: Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==
Content-Type: application/json
```

**Body:**

```json
{
  "messaging_product": "whatsapp",
  "to": "9114411234567",
  "type": "text",
  "text": {
    "body": "Test message"
  }
}
```

**Expected Response:**

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "9114411234567",
      "wa_id": "9114411234567"
    }
  ],
  "messages": [
    {
      "id": "wamid.xxxxx",
      "message_status": "failed",
      "errors": [
        {
          "code": 131047,
          "message": "Re-engagement message",
          "title": "Re-engagement message",
          "error_data": {
            "details": "Message failed to send because more than 24 hours have passed since the customer last replied to this number."
          },
          "href": "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/"
        }
      ]
    }
  ]
}
```

---

#### Test 2: Status Delay - Sent to Read (911447)

**Request:**

```
POST http://localhost:3000/v14.0/1200000000001/messages
```

**Headers:**

```
Authorization: Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==
Content-Type: application/json
```

**Body:**

```json
{
  "messaging_product": "whatsapp",
  "to": "9114471234567",
  "type": "text",
  "text": {
    "body": "Test full lifecycle"
  }
}
```

**Expected Behavior:**

1.  Immediate `200 OK` response with message ID.
2.  Webhook for `delivered` status after 1s.
3.  Webhook for `read` status after 2s.

---

#### Test 3: Ecosystem Error (911442)

**Request:**

```
POST http://localhost:3000/v14.0/1200000000001/messages
```

**Headers:**

```
Authorization: Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==
Content-Type: application/json
```

**Body:**

```json
{
  "messaging_product": "whatsapp",
  "to": "9114429876543",
  "type": "text",
  "text": {
    "body": "Test ecosystem error"
  }
}
```

**Expected Response Status:** `200 OK` with error code `131049`

---

#### Test 5: Send Message to Valid Number (Success)

**Request:**

```
POST http://localhost:3000/v14.0/1200000000001/messages
```

**Headers:**

```
Authorization: Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==
Content-Type: application/json
```

**Body:**

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "text",
  "text": {
    "body": "Test message"
  }
}
```

**Expected Response:**

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "919876543210",
      "wa_id": "919876543210"
    }
  ],
  "messages": [
    {
      "id": "wamid.xxxxx"
    }
  ]
}
```

---

## Postman Collection JSON

Save this as a `.json` file and import into Postman:

```json
{
  "info": {
    "name": "WhatsApp Simulator - Error Handling Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Test 1: Re-engagement Error (911441)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"messaging_product\": \"whatsapp\", \"to\": \"9114411234567\", \"type\": \"text\", \"text\": {\"body\": \"Test message\"}}"
        },
        "url": {
          "raw": "http://localhost:3000/v14.0/1200000000001/messages",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["v14.0", "1200000000001", "messages"]
        }
      }
    },
    {
      "name": "Test 2: Status Delay - Sent to Read (911447)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"messaging_product\": \"whatsapp\", \"to\": \"9114471234567\", \"type\": \"text\", \"text\": {\"body\": \"Test full lifecycle\"}}"
        },
        "url": {
          "raw": "http://localhost:3000/v14.0/1200000000001/messages",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["v14.0", "1200000000001", "messages"]
        }
      }
    },
    {
      "name": "Test 3: Ecosystem Error (911442)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"messaging_product\": \"whatsapp\", \"to\": \"9114429876543\", \"type\": \"text\", \"text\": {\"body\": \"Test ecosystem error\"}}"
        },
        "url": {
          "raw": "http://localhost:3000/v14.0/1200000000001/messages",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["v14.0", "1200000000001", "messages"]
        }
      }
    },
    {
      "name": "Test 4: Success (Valid Number)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer eyJhcHBfaWQiOiAiMTQwMDAwMDAwMDEiLCAid2JhX2lkIjogIjExMDAwMDAwMDAwMDEiLCAicGhvbmVfbnVtYmVyX2lkIjogIjEyMDAwMDAwMDAwMDEifQ==",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"messaging_product\": \"whatsapp\", \"to\": \"919876543210\", \"type\": \"text\", \"text\": {\"body\": \"Test message\"}}"
        },
        "url": {
          "raw": "http://localhost:3000/v14.0/1200000000001/messages",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["v14.0", "1200000000001", "messages"]
        }
      }
    }
  ]
}
```

---

## Testing Webhook Delivery

To verify webhook delivery:

1. Set up a webhook receiver (e.g., using `webhook.site` or `ngrok`)
2. Configure the `WEBHOOK_URL` environment variable
3. Send a message to an error number
4. Check the webhook receiver for the failed status webhook

### Example Webhook Receiver Setup

```bash
# Using ngrok
ngrok http 3001

# Set environment variable
export WEBHOOK_URL=https://your-ngrok-url.ngrok.io/webhook
```

---

## Adding New Error Scenarios

To add a new error scenario:

1. **Edit** `router/v14.0/router/index.js`
2. **Add** a new condition in `getErrorForNumber()`:

```javascript
else if (phoneNumber.startsWith("1445")) {
  return {
    code: 131050,
    message: "Custom error message",
    title: "Custom error title",
    error_data: {
      details: "Custom error details",
    },
    href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
  };
}
```

3. **Test** using Postman with a number starting with `1445`

---

## Summary

| Prefix   | Behavior                     | Scenario                 | Use Case                    |
| -------- | ---------------------------- | ------------------------ | --------------------------- |
| `911441` | ❌ Failure                   | Re-engagement message    | Conversation window expired |
| `911442` | ❌ Failure                   | Ecosystem engagement     | Rate limiting/health checks |
| `911443` | ❌ Failure                   | Message undeliverable    | General delivery failures   |
| `911444` | ❌ Failure                   | Experiment participation | A/B testing scenarios       |
| `911445` | ✅ Sent                      | Sent Only                | Basic sending test          |
| `911446` | ✅ Sent -> Delivered         | Status Delay             | Delivery confirmation test  |
| `911447` | ✅ Sent -> Delivered -> Read | Full Lifecycle Delay     | End-to-end status flow test |

This error handling system provides a comprehensive testing environment for WhatsApp API error scenarios without requiring actual API failures.
