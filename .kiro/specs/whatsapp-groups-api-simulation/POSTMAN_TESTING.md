# WhatsApp Groups API Simulation - Postman Testing Guide

## Setup Instructions

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select **Link** tab
4. Paste the collection URL or import the JSON below
5. Click **Import**

### 2. Set Environment Variables

Create a new environment with these variables:

```
base_url: http://localhost:3000
phone_number_id: 120363123456789
wba_id: 110000000001
app_id: 1234567890
bearer_token: (generate using instructions below)
group_id: (will be set after creating a group)
wa_id: 1234567890
```

### 3. Generate Bearer Token

In Postman, create a pre-request script:

```javascript
// Generate Bearer Token
const tokenData = {
    app_id: pm.environment.get("app_id"),
    wba_id: pm.environment.get("wba_id"),
    phone_number_id: pm.environment.get("phone_number_id")
};

const tokenString = JSON.stringify(tokenData);
const encodedToken = btoa(tokenString);
pm.environment.set("bearer_token", encodedToken);
```

---

## Postman Collection

### Collection Structure

```
WhatsApp Groups API
├── Group Lifecycle
│   ├── Create Group
│   ├── Get Group
│   ├── List Groups
│   ├── Update Group
│   └── Delete Group
├── Participant Management
│   ├── Add Participants
│   └── Remove Participant
├── Invite Links
│   ├── Get Invite Link
│   └── Reset Invite Link
├── Join Requests
│   ├── Simulate Join Request
│   ├── Get Join Requests
│   ├── Approve Join Request
│   └── Reject Join Request
├── Test Utilities
│   ├── Generate Test Data
│   └── Export Group Data
└── Error Scenarios
    ├── Invalid Phone Number ID
    ├── Invalid Group ID
    ├── Missing Required Fields
    └── Exceed Participant Limit
```

---

## API Requests

### 1. Create Group

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups
Authorization: Bearer {{bearer_token}}
Content-Type: application/json

{
  "subject": "Team Meeting",
  "description": "Weekly team sync",
  "join_approval_mode": "off",
  "participant_phone_numbers": ["1234567890", "0987654321"]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has group_id", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('group_id');
    pm.expect(jsonData.group_id).to.include('@g.us');
    pm.environment.set("group_id", jsonData.group_id);
});

pm.test("Response has success message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
});
```

---

### 2. Get Group

**Request:**
```
GET {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response includes all required fields", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('subject');
    pm.expect(jsonData).to.have.property('description');
    pm.expect(jsonData).to.have.property('join_approval_mode');
    pm.expect(jsonData).to.have.property('participants');
    pm.expect(jsonData).to.have.property('participant_count');
    pm.expect(jsonData).to.have.property('created_at');
    pm.expect(jsonData).to.have.property('updated_at');
});

pm.test("Participant count matches array length", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.participant_count).to.equal(jsonData.participants.length);
});
```

---

### 3. List Groups

**Request:**
```
GET {{base_url}}/v14.0/{{phone_number_id}}/groups?limit=10&offset=0
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has data and paging", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData).to.have.property('paging');
});

pm.test("Paging includes required fields", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.paging).to.have.property('total_count');
    pm.expect(jsonData.paging).to.have.property('limit');
    pm.expect(jsonData.paging).to.have.property('offset');
});

pm.test("Each group has required fields", function () {
    var jsonData = pm.response.json();
    jsonData.data.forEach(function(group) {
        pm.expect(group).to.have.property('id');
        pm.expect(group).to.have.property('subject');
        pm.expect(group).to.have.property('description');
        pm.expect(group).to.have.property('participant_count');
        pm.expect(group).to.have.property('created_at');
    });
});
```

---

### 4. Update Group

**Request:**
```
PUT {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}
Authorization: Bearer {{bearer_token}}
Content-Type: application/json

{
  "subject": "Updated Team Meeting",
  "description": "Updated description"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Subject is updated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.subject).to.equal("Updated Team Meeting");
});

pm.test("Description is updated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.description).to.equal("Updated description");
});

pm.test("Updated_at timestamp is refreshed", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('updated_at');
});
```

---

### 5. Delete Group

**Request:**
```
DELETE {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData.message).to.include('deleted');
});
```

---

### 6. Add Participants

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/participants
Authorization: Bearer {{bearer_token}}
Content-Type: application/json

{
  "phone_numbers": ["1111111111", "2222222222"]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response includes added_participants", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('added_participants');
    pm.expect(jsonData.added_participants).to.be.an('array');
});

pm.test("Added participants count is correct", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.added_participants.length).to.equal(2);
});
```

---

### 7. Remove Participant

**Request:**
```
DELETE {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/participants/{{wa_id}}
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData.message).to.include('removed');
});
```

---

### 8. Get Invite Link

**Request:**
```
GET {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/invite_link
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response includes invite_link and expiration_timestamp", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('invite_link');
    pm.expect(jsonData).to.have.property('expiration_timestamp');
});

pm.test("Invite link is valid URL", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.invite_link).to.match(/^https?:\/\/.+/);
});

pm.test("Expiration timestamp is number", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.expiration_timestamp).to.be.a('number');
});
```

---

### 9. Reset Invite Link

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/invite_link/reset
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response includes new invite_link", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('invite_link');
    pm.expect(jsonData).to.have.property('expiration_timestamp');
});

pm.test("New link is different from old link", function () {
    var jsonData = pm.response.json();
    var oldLink = pm.environment.get("invite_link");
    if (oldLink) {
        pm.expect(jsonData.invite_link).to.not.equal(oldLink);
    }
    pm.environment.set("invite_link", jsonData.invite_link);
});
```

---

### 10. Simulate Join Request

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/simulate_join_request
Authorization: Bearer {{bearer_token}}
Content-Type: application/json

{
  "wa_id": "3333333333"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData.message).to.include('created');
});
```

---

### 11. Get Join Requests

**Request:**
```
GET {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/join_requests
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response includes data array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Each join request has required fields", function () {
    var jsonData = pm.response.json();
    jsonData.data.forEach(function(request) {
        pm.expect(request).to.have.property('wa_id');
        pm.expect(request).to.have.property('requested_at');
    });
});
```

---

### 12. Approve Join Request

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/join_requests/{{wa_id}}/approve
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData.message).to.include('approved');
});
```

---

### 13. Reject Join Request

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups/{{group_id}}/join_requests/{{wa_id}}/reject
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData.message).to.include('rejected');
});
```

---

### 14. Generate Test Data

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups/test/generate
Authorization: Bearer {{bearer_token}}
Content-Type: application/json

{
  "count": 5
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response includes created groups", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('groups');
    pm.expect(jsonData.groups).to.be.an('array');
});

pm.test("All group IDs end with @g.us", function () {
    var jsonData = pm.response.json();
    jsonData.groups.forEach(function(group) {
        pm.expect(group.group_id).to.include('@g.us');
    });
});
```

---

### 15. Export Group Data

**Request:**
```
GET {{base_url}}/v14.0/{{phone_number_id}}/groups/export
Authorization: Bearer {{bearer_token}}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response includes groups array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('groups');
    pm.expect(jsonData.groups).to.be.an('array');
});

pm.test("Each group has complete details", function () {
    var jsonData = pm.response.json();
    jsonData.groups.forEach(function(group) {
        pm.expect(group).to.have.property('id');
        pm.expect(group).to.have.property('subject');
        pm.expect(group).to.have.property('description');
        pm.expect(group).to.have.property('join_approval_mode');
        pm.expect(group).to.have.property('participants');
        pm.expect(group).to.have.property('participant_count');
        pm.expect(group).to.have.property('created_at');
        pm.expect(group).to.have.property('updated_at');
    });
});
```

---

## Error Scenario Tests

### Test: Invalid Phone Number ID

**Request:**
```
GET {{base_url}}/v14.0/invalid/groups
Authorization: Bearer {{bearer_token}}
```

**Expected:**
```
Status: 400
{
  "error": "Invalid phone_number_id",
  "code": 400
}
```

---

### Test: Invalid Group ID

**Request:**
```
GET {{base_url}}/v14.0/{{phone_number_id}}/groups/invalid
Authorization: Bearer {{bearer_token}}
```

**Expected:**
```
Status: 400
{
  "error": "Invalid group_id",
  "code": 400
}
```

---

### Test: Missing Required Fields

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups
Authorization: Bearer {{bearer_token}}
Content-Type: application/json

{
  "subject": "Test"
}
```

**Expected:**
```
Status: 400
{
  "error": "Missing required fields: join_approval_mode",
  "code": 400
}
```

---

### Test: Exceed Participant Limit

**Request:**
```
POST {{base_url}}/v14.0/{{phone_number_id}}/groups
Authorization: Bearer {{bearer_token}}
Content-Type: application/json

{
  "subject": "Test",
  "join_approval_mode": "off",
  "participant_phone_numbers": ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
}
```

**Expected:**
```
Status: 400
{
  "error": "Maximum 8 participants allowed",
  "code": 400
}
```

---

### Test: Group Not Found

**Request:**
```
GET {{base_url}}/v14.0/{{phone_number_id}}/groups/invalid@g.us
Authorization: Bearer {{bearer_token}}
```

**Expected:**
```
Status: 404
{
  "error": "Group not found",
  "code": 404
}
```

---

## Testing Workflow in Postman

### 1. Setup
- [ ] Create environment with variables
- [ ] Generate bearer token
- [ ] Set base_url

### 2. Group Lifecycle
- [ ] Create Group
- [ ] Get Group
- [ ] List Groups
- [ ] Update Group
- [ ] Delete Group

### 3. Participant Management
- [ ] Add Participants
- [ ] Remove Participant

### 4. Invite Links
- [ ] Get Invite Link
- [ ] Reset Invite Link

### 5. Join Requests
- [ ] Simulate Join Request
- [ ] Get Join Requests
- [ ] Approve Join Request
- [ ] Reject Join Request

### 6. Test Utilities
- [ ] Generate Test Data
- [ ] Export Group Data

### 7. Error Scenarios
- [ ] Invalid Phone Number ID
- [ ] Invalid Group ID
- [ ] Missing Required Fields
- [ ] Exceed Participant Limit
- [ ] Group Not Found

### 8. Run Collection
- [ ] Run entire collection
- [ ] Verify all tests pass
- [ ] Check response times
- [ ] Verify no errors

---

## Postman Collection JSON

You can import this collection directly into Postman:

```json
{
  "info": {
    "name": "WhatsApp Groups API",
    "description": "Complete testing collection for WhatsApp Groups API Simulation",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Group Lifecycle",
      "item": [
        {
          "name": "Create Group",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{bearer_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"subject\": \"Team Meeting\", \"description\": \"Weekly team sync\", \"join_approval_mode\": \"off\", \"participant_phone_numbers\": [\"1234567890\", \"0987654321\"]}"
            },
            "url": {
              "raw": "{{base_url}}/v14.0/{{phone_number_id}}/groups",
              "host": ["{{base_url}}"],
              "path": ["v14.0", "{{phone_number_id}}", "groups"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## Tips for Postman Testing

1. **Use Environment Variables**: Store phone_number_id, group_id, wa_id in environment
2. **Set Variables from Responses**: Use tests to extract and set variables for next requests
3. **Run Collections**: Use Collection Runner to test entire workflow
4. **Monitor Performance**: Check response times for each endpoint
5. **Verify Webhooks**: Use webhook.site to capture and verify webhook payloads
6. **Test Error Cases**: Always test with invalid data
7. **Use Pre-request Scripts**: Generate tokens and set variables before requests
8. **Document Tests**: Add descriptions to each request

---

## Success Criteria

✅ All 14 endpoints return 200 status
✅ All responses include required fields
✅ All error scenarios return correct status codes
✅ All tests pass in collection runner
✅ Response times are acceptable
✅ No authentication errors
✅ Data is correctly persisted

**Status: READY FOR TESTING** ✅
