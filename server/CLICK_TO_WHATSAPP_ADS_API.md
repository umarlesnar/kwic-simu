# Click to WhatsApp Ads API - Postman Testing Documentation

## Base Configuration

**Base URL:** `http://localhost:3000/v14.0`

**Authorization Header:**
```
Authorization: Bearer eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSJ9
```
*(Base64 encoded: `{"app_id":"1400000001","wba_id":"1100000001"}`)*

**Content-Type:**
```
Content-Type: application/json
```

---

## API Endpoints

### 1. Create Ad Campaign

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/campaigns`

**Body:**
```json
{
  "name": "Click to WhatsApp Campaign",
  "objective": "OUTCOME_ENGAGEMENT",
  "status": "PAUSED",
  "special_ad_categories": []
}
```

**Response:**
```json
{
  "id": "19xxxxxxxxxx"
}
```

**Supported Objectives:**
- `OUTCOME_ENGAGEMENT`
- `OUTCOME_LEADS`
- `OUTCOME_SALES`
- `OUTCOME_TRAFFIC`

---

### 2. Get Campaign

**Method:** `GET`  
**URL:** `{{baseUrl}}/{{campaignId}}?fields=name,status,objective`

**Response:**
```json
{
  "id": "19xxxxxxxxxx",
  "name": "Click to WhatsApp Campaign",
  "status": "PAUSED",
  "objective": "OUTCOME_ENGAGEMENT"
}
```

---

### 3. Update Campaign

**Method:** `POST`  
**URL:** `{{baseUrl}}/{{campaignId}}`

**Body:**
```json
{
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 4. Create Ad Set

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adsets`

**Body:**
```json
{
  "name": "WhatsApp Ad Set",
  "campaign_id": "{{campaignId}}",
  "billing_event": "IMPRESSIONS",
  "destination_type": "WHATSAPP",
  "optimization_goal": "IMPRESSIONS",
  "promoted_object": {
    "page_id": "123456789"
  },
  "targeting": {
    "geo_locations": {
      "countries": ["US", "CA"]
    },
    "device_platforms": ["mobile", "desktop"]
  },
  "status": "PAUSED",
  "daily_budget": 1000,
  "start_time": "2025-02-15T00:00:00+0000"
}
```

**Response:**
```json
{
  "id": "20xxxxxxxxxx"
}
```

**Optimization Goals:**
- `CONVERSATIONS`
- `LINK_CLICKS`
- `IMPRESSIONS`
- `REACH`
- `OFFSITE_CONVERSIONS`
- `LANDING_PAGE_VIEWS`
- `POST_ENGAGEMENT`

---

### 5. Get Ad Set

**Method:** `GET`  
**URL:** `{{baseUrl}}/{{adSetId}}?fields=name,destination_type,optimization_goal,status`

**Response:**
```json
{
  "id": "20xxxxxxxxxx",
  "name": "WhatsApp Ad Set",
  "destination_type": "WHATSAPP",
  "optimization_goal": "IMPRESSIONS",
  "status": "PAUSED"
}
```

---

### 6. Update Ad Set

**Method:** `POST`  
**URL:** `{{baseUrl}}/{{adSetId}}`

**Body:**
```json
{
  "status": "ACTIVE",
  "daily_budget": 2000
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 7. Create Ad Creative - Basic with Autofill Message

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad Creative",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "name": "Shop Now",
      "message": "Check out our latest products!",
      "description": "Limited time offer",
      "image_hash": "abc123hash",
      "link": "https://api.whatsapp.com/send",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {
        "type": "VISUAL_EDITOR",
        "version": 2,
        "landing_screen_type": "welcome_message",
        "media_type": "text",
        "text_format": {
          "customer_action_type": "autofill_message",
          "message": {
            "text": "Hello! How can we help you today?",
            "autofill_message": {
              "content": "I'm interested in your products"
            }
          }
        }
      }
    }
  }
}
```

**Response:**
```json
{
  "id": "21xxxxxxxxxx"
}
```

---

### 8. Create Ad Creative - With Icebreakers

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad Creative with Icebreakers",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "name": "Contact Us",
      "message": "Get in touch with us",
      "link": "https://api.whatsapp.com/send",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {
        "type": "VISUAL_EDITOR",
        "version": 2,
        "landing_screen_type": "welcome_message",
        "media_type": "text",
        "text_format": {
          "customer_action_type": "ice_breakers",
          "message": {
            "text": "Welcome! How can we assist you?",
            "ice_breakers": [
              {"title": "View Products"},
              {"title": "Check Pricing"},
              {"title": "Contact Support"}
            ]
          }
        }
      }
    }
  }
}
```

---

### 9. Create Ad Creative - With Call CTA

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad Creative with Call",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "name": "Call Now",
      "link": "https://api.whatsapp.com/send",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {
        "type": "VISUAL_EDITOR",
        "version": 2,
        "landing_screen_type": "welcome_message",
        "media_type": "text",
        "text_format": {
          "customer_action_type": "autofill_message",
          "message": {
            "text": "Need help? We're here for you!",
            "automated_greeting_message_cta": {
              "type": "call"
            },
            "autofill_message": {
              "content": "I need assistance"
            }
          }
        }
      }
    }
  }
}
```

---

### 10. Create Ad Creative - With Website CTA

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad Creative with Website",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "name": "Visit Website",
      "link": "https://api.whatsapp.com/send",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {
        "type": "VISUAL_EDITOR",
        "version": 2,
        "landing_screen_type": "welcome_message",
        "media_type": "text",
        "text_format": {
          "customer_action_type": "autofill_message",
          "message": {
            "text": "Explore our website for more details",
            "automated_greeting_message_cta": {
              "type": "url",
              "url": "https://example.com"
            },
            "autofill_message": {
              "content": "Tell me more"
            }
          }
        }
      }
    }
  }
}
```

---

### 11. Create Ad Creative - With Catalog CTA

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad Creative with Catalog",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "name": "View Catalog",
      "link": "https://api.whatsapp.com/send",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {
        "type": "VISUAL_EDITOR",
        "version": 2,
        "landing_screen_type": "welcome_message",
        "media_type": "text",
        "text_format": {
          "customer_action_type": "autofill_message",
          "message": {
            "text": "Browse our product catalog",
            "automated_greeting_message_cta": {
              "type": "catalog"
            },
            "autofill_message": {
              "content": "Show me products"
            }
          }
        }
      }
    }
  }
}
```

---

### 12. Create Ad Creative - With WhatsApp Flow

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad Creative with Flow",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "name": "Apply Now",
      "link": "https://api.whatsapp.com/send",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {
        "type": "VISUAL_EDITOR",
        "version": 2,
        "landing_screen_type": "ctwa_flows",
        "media_type": "text",
        "text_format": {
          "customer_action_type": "whatsapp_flow",
          "message": {
            "text": "Start your application process",
            "automated_greeting_message_cta": {
              "type": "flow",
              "flow_data": {
                "call_to_action": "Apply now",
                "flow_id": "1800000000001"
              }
            },
            "autofill_message": {
              "content": "I want to apply"
            }
          }
        }
      }
    }
  }
}
```

---

### 13. Create Ad Creative - With Call Prompt

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad Creative with Call Prompt",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "image_hash": "abc123",
      "name": "Call Us",
      "link": "https://api.whatsapp.com/send",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {
        "type": "VISUAL_EDITOR",
        "version": 2,
        "landing_screen_type": "ctwa_call_prompt",
        "media_type": "text",
        "text_format": {
          "message": {
            "text": "Need immediate assistance?",
            "call_prompt_data": {
              "call_prompt_message": "Call us now for instant support"
            }
          }
        }
      }
    }
  }
}
```

---

### 14. Create Ad Creative - Using Instagram Content

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "source_instagram_media_id": "17841234567890123",
  "instagram_user_id": "123456789",
  "object_id": "123456789",
  "call_to_action": {
    "type": "WHATSAPP_MESSAGE",
    "value": {
      "link": "https://api.whatsapp.com/send",
      "app_destination": "WHATSAPP"
    }
  },
  "degrees_of_freedom_spec": {
    "creative_features_spec": {
      "standard_enhancements": {
        "enroll_status": "OPT_IN"
      }
    }
  }
}
```

---

### 15. Create Ad Creative - With Message Sequence

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/adcreatives`

**Body:**
```json
{
  "name": "WhatsApp Ad with Message Sequence",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "image_hash": "abc123",
      "link": "https://example.com/image.jpg",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      }
    }
  },
  "asset_feed_spec": {
    "additional_data": {
      "partner_app_welcome_message_flow_id": "SEQUENCE-ID-123"
    }
  }
}
```

---

### 16. Get Ad Creative

**Method:** `GET`  
**URL:** `{{baseUrl}}/{{creativeId}}?fields=name,object_story_spec`

**Response:**
```json
{
  "id": "21xxxxxxxxxx",
  "name": "WhatsApp Ad Creative",
  "object_story_spec": {
    "page_id": "123456789",
    "link_data": {
      "name": "Shop Now",
      "message": "Check out our latest products!",
      "call_to_action": {
        "type": "WHATSAPP_MESSAGE",
        "value": {
          "app_destination": "WHATSAPP"
        }
      },
      "page_welcome_message": {...}
    }
  }
}
```

---

### 17. Update Ad Creative

**Method:** `POST`  
**URL:** `{{baseUrl}}/{{creativeId}}`

**Body:**
```json
{
  "name": "Updated WhatsApp Ad Creative"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 18. Create Ad

**Method:** `POST`  
**URL:** `{{baseUrl}}/act_123456789/ads`

**Body:**
```json
{
  "name": "WhatsApp Ad",
  "adset_id": "{{adSetId}}",
  "creative": {
    "creative_id": "{{creativeId}}"
  },
  "status": "PAUSED"
}
```

**Response:**
```json
{
  "id": "22xxxxxxxxxx"
}
```

---

### 19. Get Ad

**Method:** `GET`  
**URL:** `{{baseUrl}}/{{adId}}?fields=status,adset_id,campaign_id`

**Response:**
```json
{
  "id": "22xxxxxxxxxx",
  "status": "PAUSED",
  "adset_id": "20xxxxxxxxxx",
  "campaign_id": "19xxxxxxxxxx"
}
```

---

### 20. Update Ad

**Method:** `POST`  
**URL:** `{{baseUrl}}/{{adId}}`

**Body:**
```json
{
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Postman Environment Variables

Create these variables in Postman:

| Variable | Initial Value | Description |
|----------|--------------|-------------|
| `baseUrl` | `http://localhost:3000/v14.0` | Base API URL |
| `authToken` | `eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSJ9` | Bearer token |
| `adAccountId` | `act_123456789` | Ad account ID |
| `campaignId` | *(set after creation)* | Campaign ID |
| `adSetId` | *(set after creation)* | Ad Set ID |
| `creativeId` | *(set after creation)* | Creative ID |
| `adId` | *(set after creation)* | Ad ID |

---

## Testing Workflow

1. **Create Campaign** → Save `campaignId`
2. **Get Campaign** → Verify creation
3. **Create Ad Set** → Use `campaignId`, save `adSetId`
4. **Get Ad Set** → Verify creation
5. **Create Ad Creative** → Save `creativeId`
6. **Get Ad Creative** → Verify creation
7. **Create Ad** → Use `adSetId` and `creativeId`, save `adId`
8. **Get Ad** → Verify creation
9. **Update Campaign** → Set status to ACTIVE
10. **Update Ad** → Set status to ACTIVE

---

## Error Responses

**400 Bad Request:**
```json
{
  "error": "Missing required parameters"
}
```

**404 Not Found:**
```json
{
  "error": "Campaign not found"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authorization header missing"
}
```

---

## Notes

- All IDs starting with `19` are Campaign IDs
- All IDs starting with `20` are Ad Set IDs
- All IDs starting with `21` are Ad Creative IDs
- All IDs starting with `22` are Ad IDs
- Ad Account IDs must start with `act_`
- All timestamps use ISO 8601 format
- Budget values are in cents (1000 = $10.00)
