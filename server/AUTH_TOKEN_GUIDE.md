# WhatsApp Flow API - Authorization Token Guide

## How to Create Authorization Token

The WhatsApp Flow API uses Base64 encoded JSON for authorization tokens.

### Step 1: Create JSON Object
Create a JSON object with your credentials:
```json
{
  "wba_id": "1100000002",
  "catalog_id": "17000000002"
}
```

### Step 2: Encode to Base64

**Using https://www.base64encode.org/:**

1. Go to https://www.base64encode.org/
2. Paste your JSON: `{"wba_id":"1100000002","catalog_id":"17000000002"}`
3. Click "Encode"
4. Copy the result: `eyJ3YmFfaWQiOiIxMTAwMDAwMDAyIiwiY2F0ZWxvZ19pZCI6IjE3MDAwMDAwMDAyIn0=`

### Step 3: Use in Authorization Header
```
Authorization: Bearer eyJ3YmFfaWQiOiIxMTAwMDAwMDAyIiwiY2F0ZWxvZ19pZCI6IjE3MDAwMDAwMDAyIn0=
```

## How to Decode Authorization Token

**Using https://www.base64decode.org/:**

1. Go to https://www.base64decode.org/
2. Paste the token: `eyJ3YmFfaWQiOiIxMTAwMDAwMDAyIiwiY2F0ZWxvZ19pZCI6IjE3MDAwMDAwMDAyIn0=`
3. Click "Decode"
4. Result: `{"wba_id":"1100000002","catalog_id":"17000000002"}`

## Example Tokens

| Credentials | Base64 Token |
|-------------|--------------|
| `{"wba_id":"1100000000001","app_id":"1400000001"}` | `eyJ3YmFfaWQiOiIxMTAwMDAwMDAwMDAxIiwiYXBwX2lkIjoiMTQwMDAwMDAwMDEifQ==` |
| `{"wba_id":"1100000002","catalog_id":"17000000002"}` | `eyJ3YmFfaWQiOiIxMTAwMDAwMDAyIiwiY2F0ZWxvZ19pZCI6IjE3MDAwMDAwMDAyIn0=` |

## Testing in Postman

1. **Create New Request**
2. **Add Authorization Header:**
   - Key: `Authorization`
   - Value: `Bearer eyJ3YmFfaWQiOiIxMTAwMDAwMDAyIiwiY2F0ZWxvZ19pZCI6IjE3MDAwMDAwMDAyIn0=`
3. **Test Endpoints:**
   - GET `/v14.0/1100000002/flows`
   - GET `/v14.0/1800000000001/assets`
   - GET `/v14.0/1800000000001?fields=id,name,status`