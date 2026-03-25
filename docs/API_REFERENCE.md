# SEO Analyzer Pro - API Reference

> Complete API documentation for SEO Analyzer Pro

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints](#endpoints)
5. [Data Models](#data-models)
6. [Error Codes](#error-codes)
7. [Webhooks](#webhooks)
8. [SDK Usage](#sdk-usage)

---

## Overview

### Base URL

```
Production: https://api.seoanalyzer.pro/v1
Staging:    https://staging-api.seoanalyzer.pro/v1
```

> **[NEEDS VERIFICATION — V-01]** The URLs above are placeholder values.
> Confirmed production and staging base URLs have not been verified from deployment evidence.
> Update this section before publishing external documentation.

### API Versioning

The API uses URL-based versioning. All endpoints are prefixed with `/v1/`.

### Content Type

All requests and responses use JSON:

```
Content-Type: application/json
Accept: application/json
```

### Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-24T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## Authentication

### API Keys

All API requests require authentication via API key.

#### Obtaining an API Key

1. Sign up at [seoanalyzer.pro](https://seoanalyzer.pro)
2. Navigate to Settings → API Keys
3. Click "Generate New Key"
4. Store the key securely

#### Using API Keys

Include the key in the request header:

```http
GET /v1/analyze HTTP/1.1
Host: api.seoanalyzer.pro
Authorization: Bearer sk_live_xxxxxxxxxxxx
```

#### API Key Types

| Type | Prefix | Use Case |
|------|--------|----------|
| Production | `sk_live_` | Live applications |
| Test | `sk_test_` | Development/testing |
| Restricted | `sk_restr_` | Limited permissions |

### OAuth 2.0 (Enterprise)

For enterprise customers, OAuth 2.0 is available:

```mermaid
sequenceDiagram
    Client->>Auth Server: Request authorization
    Auth Server->>Client: Authorization code
    Client->>Auth Server: Exchange code for token
    Auth Server->>Client: Access token + Refresh token
    Client->>API: Request with Bearer token
    API->>Client: Response
```

#### OAuth Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `/oauth/authorize` |
| Token | `/oauth/token` |
| Revoke | `/oauth/revoke` |

---

## Rate Limiting

### Limits by Plan

| Plan | Requests/min | Requests/day |
|------|-------------|--------------|
| Free | 10 | 100 |
| Starter | 60 | 1,000 |
| Professional | 300 | 10,000 |
| Enterprise | Unlimited | Unlimited |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1648132800
```

### Rate Limit Exceeded

When rate limited, the API returns `429 Too Many Requests`:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

### Best Practices

```javascript
// Implement exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      continue;
    }
    
    return response;
  }
  throw new Error('Max retries exceeded');
}
```

---

## Endpoints

### Analyze Website

Analyzes a website and returns comprehensive SEO/GEO scores.

```http
POST /v1/analyze
```

#### Request

```json
{
  "url": "https://example.com",
  "options": {
    "includeScreenshots": false,
    "deepAnalysis": true,
    "categories": ["onpage", "geo", "core", "eeat", "technical"]
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | URL to analyze (must include protocol) |
| `options.includeScreenshots` | boolean | No | Include page screenshots (default: false) |
| `options.deepAnalysis` | boolean | No | Perform deeper content analysis (default: true) |
| `options.categories` | array | No | Categories to analyze (default: all) |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "analysis_abc123",
    "url": "https://example.com",
    "timestamp": "2026-03-24T10:30:00Z",
    "scores": {
      "overall": 75,
      "onpage": 80,
      "geo": 70,
      "core": 72,
      "eeat": 78,
      "technical": 75
    },
    "analysis": {
      "onpage": {
        "title": {
          "value": "Example Domain",
          "length": 14,
          "optimal": false,
          "exists": true
        },
        "metaDescription": {
          "value": "This domain is for use in illustrative examples...",
          "length": 52,
          "optimal": false,
          "exists": true
        },
        "headings": {
          "h1": { "count": 1, "texts": ["Example Domain"] },
          "h2": { "count": 0 },
          "h3": { "count": 0 },
          "hasHierarchy": false
        },
        "images": {
          "total": 0,
          "withoutAlt": 0,
          "altCoverage": 100
        },
        "links": {
          "total": 1,
          "internal": 0,
          "external": 1
        },
        "openGraph": {
          "hasTitle": false,
          "hasDescription": false,
          "hasImage": false,
          "complete": false
        },
        "canonical": {
          "exists": false,
          "value": null
        },
        "content": {
          "wordCount": 57,
          "sufficient": false
        }
      },
      "geo": {
        "c02_directAnswer": {
          "hasEarlyAnswer": true,
          "firstWords": "This domain is for use in illustrative examples..."
        },
        "c09_faqCoverage": {
          "hasFAQSchema": false,
          "hasQAPattern": false,
          "questionCount": 0
        },
        "o03_dataTables": {
          "tableCount": 0,
          "listCount": 0
        },
        "o05_schemaMarkup": {
          "hasFAQSchema": false,
          "hasArticleSchema": false,
          "hasOrganizationSchema": false,
          "schemaCount": 0
        },
        "e01_originalData": {
          "hasStatistics": false,
          "hasQuotableContent": false
        },
        "o02_summaryBox": {
          "hasTakeaways": false,
          "hasConclusion": false
        }
      },
      "core": {
        "contextualClarity": { "score": 50 },
        "organization": { "score": 25 },
        "referenceability": { "score": 50 },
        "exclusivity": { "score": 25 }
      },
      "eeat": {
        "experience": { "score": 33 },
        "expertise": { "score": 50 },
        "authoritativeness": { "score": 50 },
        "trust": { "score": 0 }
      },
      "technical": {
        "indexing": { "score": 50 },
        "mobile": { "score": 100 },
        "html": { "score": 67 },
        "images": { "score": 100 }
      }
    },
    "actionItems": [
      {
        "priority": "high",
        "category": "On-Page SEO",
        "action": "Optimize title length",
        "llmInstruction": "The current title is 14 characters. Rewrite to 30-60 characters."
      }
    ],
    "llmPrompt": "# SEO & GEO Improvement Task\n\n## Target URL\nhttps://example.com\n\n..."
  },
  "meta": {
    "timestamp": "2026-03-24T10:30:00Z",
    "requestId": "req_xyz789",
    "processingTime": 2.5
  }
}
```

---

### Get Analysis by ID

Retrieves a previously run analysis.

```http
GET /v1/analyze/{analysisId}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `analysisId` | string | Yes | Analysis ID from previous request |

#### Response

Same as POST /v1/analyze response.

---

### Batch Analysis

Analyze multiple URLs in a single request.

```http
POST /v1/analyze/batch
```

#### Request

```json
{
  "urls": [
    "https://example.com",
    "https://example.org",
    "https://example.net"
  ],
  "webhook": "https://your-server.com/webhook/analysis-complete",
  "options": {
    "deepAnalysis": true
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `urls` | array | Yes | URLs to analyze (max 100) |
| `webhook` | string | No | Webhook URL for completion notification |
| `options` | object | No | Same as single analysis |

#### Response

```json
{
  "success": true,
  "data": {
    "batchId": "batch_abc123",
    "status": "processing",
    "totalUrls": 3,
    "estimatedCompletion": "2026-03-24T10:35:00Z"
  }
}
```

---

### Get Batch Status

Check the status of a batch analysis.

```http
GET /v1/analyze/batch/{batchId}
```

#### Response

```json
{
  "success": true,
  "data": {
    "batchId": "batch_abc123",
    "status": "completed",
    "totalUrls": 3,
    "completed": 3,
    "failed": 0,
    "results": [
      { "url": "https://example.com", "analysisId": "analysis_123", "score": 75 },
      { "url": "https://example.org", "analysisId": "analysis_456", "score": 82 },
      { "url": "https://example.net", "analysisId": "analysis_789", "score": 68 }
    ]
  }
}
```

---

### Generate LLM Prompt

Generate an LLM prompt for a specific analysis.

```http
GET /v1/analyze/{analysisId}/prompt
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | markdown | Output format (markdown, json) |
| `language` | string | en | Prompt language |
| `llm` | string | general | Target LLM (general, chatgpt, claude) |

#### Response

```json
{
  "success": true,
  "data": {
    "prompt": "# SEO & GEO Improvement Task\n\n## Target URL\n...",
    "format": "markdown",
    "wordCount": 450
  }
}
```

---

### Export Report

Generate a downloadable report.

```http
GET /v1/analyze/{analysisId}/export
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | pdf | Export format (pdf, html, json) |
| `includePrompt` | boolean | true | Include LLM prompt |

#### Response

Returns the file directly with appropriate headers:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="seo-analysis-2026-03-24.pdf"
```

---

### Compare Analyses

Compare two or more analyses.

```http
POST /v1/compare
```

#### Request

```json
{
  "analysisIds": ["analysis_123", "analysis_456"],
  "metrics": ["overall", "onpage", "geo"]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "comparison": {
      "analysis_123": {
        "overall": 75,
        "onpage": 80,
        "geo": 70
      },
      "analysis_456": {
        "overall": 82,
        "onpage": 85,
        "geo": 78
      }
    },
    "differences": {
      "overall": 7,
      "onpage": 5,
      "geo": 8
    },
    "winner": "analysis_456"
  }
}
```

---

## Data Models

### Analysis Object

```typescript
interface Analysis {
  id: string;
  url: string;
  timestamp: string;
  scores: {
    overall: number;
    onpage: number;
    geo: number;
    core: number;
    eeat: number;
    technical: number;
  };
  analysis: {
    onpage: OnPageAnalysis;
    geo: GEOAnalysis;
    core: COREAnalysis;
    eeat: EEATAnalysis;
    technical: TechnicalAnalysis;
  };
  actionItems: ActionItem[];
  llmPrompt: string;
}
```

### Action Item Object

```typescript
interface ActionItem {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  action: string;
  llmInstruction: string;
}
```

### Score Object

```typescript
interface Scores {
  overall: number;    // 0-100
  onpage: number;     // 0-100
  geo: number;        // 0-100
  core: number;       // 0-100
  eeat: number;       // 0-100
  technical: number;  // 0-100
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_URL` | 400 | URL format is invalid |
| `URL_NOT_ACCESSIBLE` | 400 | URL cannot be fetched |
| `MISSING_PARAMETER` | 400 | Required parameter missing |
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | API key lacks required permissions |
| `ANALYSIS_NOT_FOUND` | 404 | Analysis ID does not exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `BATCH_LIMIT_EXCEEDED` | 400 | Batch size exceeds limit |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Webhooks

### Configuration

Configure webhooks in your dashboard or via API:

```http
POST /v1/webhooks
```

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["analysis.completed", "batch.completed"],
  "secret": "whsec_xxxxxxxxxxxx"
}
```

### Events

| Event | Description |
|-------|-------------|
| `analysis.completed` | Single analysis finished |
| `analysis.failed` | Analysis failed |
| `batch.completed` | Batch analysis finished |
| `batch.failed` | Batch analysis failed |

### Webhook Payload

```json
{
  "event": "analysis.completed",
  "timestamp": "2026-03-24T10:30:00Z",
  "data": {
    "analysisId": "analysis_abc123",
    "url": "https://example.com",
    "scores": {
      "overall": 75
    }
  },
  "signature": "sha256=..."
}
```

### Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## SDK Usage

### JavaScript/TypeScript

```bash
npm install @seoanalyzer/sdk
```

```javascript
import { SEOAnalyzer } from '@seoanalyzer/sdk';

const client = new SEOAnalyzer({
  apiKey: 'sk_live_xxxxxxxxxxxx'
});

// Analyze a URL
const analysis = await client.analyze('https://example.com');
console.log(analysis.scores.overall);

// Get action items
const actions = analysis.actionItems.filter(
  item => item.priority === 'critical'
);

// Generate PDF report
const pdf = await client.exportReport(analysis.id, { format: 'pdf' });
```

### Python

```bash
pip install seoanalyzer
```

```python
from seoanalyzer import Client

client = Client(api_key='sk_live_xxxxxxxxxxxx')

# Analyze a URL
analysis = client.analyze('https://example.com')
print(f"Overall Score: {analysis.scores.overall}")

# Get critical action items
critical = [a for a in analysis.action_items if a.priority == 'critical']

# Export report
pdf = client.export_report(analysis.id, format='pdf')
with open('report.pdf', 'wb') as f:
    f.write(pdf)
```

### cURL Examples

```bash
# Analyze a URL
curl -X POST https://api.seoanalyzer.pro/v1/analyze \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Get analysis by ID
curl https://api.seoanalyzer.pro/v1/analyze/analysis_abc123 \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"

# Export PDF report
curl https://api.seoanalyzer.pro/v1/analyze/analysis_abc123/export \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \
  -o report.pdf
```

---

## Changelog

### API Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | 2026-03-24 | Initial API release |

---

<div align="center">

**API Support**: api-support@legacyai.space

Copyright (c) 2026 Legacy AI / Floyd's Labs

www.LegacyAI.space | www.FloydsLabs.com

</div>
