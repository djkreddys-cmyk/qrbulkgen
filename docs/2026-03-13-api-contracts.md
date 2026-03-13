# QRBulkGen API Contracts - March 13, 2026

## Conventions
- Base URL: `/api`
- Auth: bearer token or secure session token from login/register response
- Error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": {}
  }
}
```

## POST /api/auth/register
Creates a user account.

### Request
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

### Response
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "session-token"
}
```

## POST /api/auth/login
Authenticates an existing user.

### Request
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

### Response
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "session-token"
}
```

## POST /api/qr/single
Generates one QR code synchronously.

### Request
```json
{
  "content": "https://example.com",
  "size": 512,
  "foregroundColor": "#000000",
  "backgroundColor": "#ffffff",
  "margin": 2,
  "format": "png",
  "errorCorrectionLevel": "M",
  "filenamePrefix": "campaign"
}
```

### Response
```json
{
  "job": {
    "id": "uuid",
    "type": "single",
    "status": "completed"
  },
  "artifact": {
    "fileName": "campaign-uuid.png",
    "downloadUrl": "/api/jobs/uuid/download"
  }
}
```

## POST /api/qr/bulk
Uploads a CSV and creates a queued bulk job.

### Request
`multipart/form-data`

Fields:
- `file`: CSV file
- `size`
- `foregroundColor`
- `backgroundColor`
- `margin`
- `format`
- `errorCorrectionLevel`
- `filenamePrefix`

### CSV MVP Rule
- Required column: `content`
- Shared customization applies to all rows

### Response
```json
{
  "job": {
    "id": "uuid",
    "type": "bulk",
    "status": "queued",
    "totalCount": 0
  }
}
```

## GET /api/jobs
Returns authenticated user jobs, newest first.

### Response
```json
{
  "jobs": [
    {
      "id": "uuid",
      "type": "bulk",
      "status": "processing",
      "totalCount": 1000,
      "successCount": 400,
      "failureCount": 0,
      "createdAt": "2026-03-13T10:00:00.000Z",
      "completedAt": null
    }
  ]
}
```

## GET /api/jobs/:id
Returns authenticated user job details.

### Response
```json
{
  "job": {
    "id": "uuid",
    "type": "bulk",
    "status": "completed",
    "totalCount": 1000,
    "successCount": 998,
    "failureCount": 2,
    "errorMessage": null,
    "createdAt": "2026-03-13T10:00:00.000Z",
    "completedAt": "2026-03-13T10:05:00.000Z"
  },
  "artifact": {
    "fileName": "campaign-uuid.zip",
    "downloadUrl": "/api/jobs/uuid/download"
  }
}
```

## GET /api/jobs/:id/download
Downloads the final artifact for a completed job.

### Behavior
- `single` job returns QR image
- `bulk` job returns ZIP
- returns `404` if no artifact exists
- returns `409` if job is not completed

## GET /api/analytics/summary
Returns dashboard summary for the authenticated user.

### Response
```json
{
  "summary": {
    "totalJobs": 24,
    "singleJobs": 11,
    "bulkJobs": 13,
    "totalQrsGenerated": 5420,
    "completedJobs": 21,
    "failedJobs": 3
  },
  "recentActivity": [
    {
      "jobId": "uuid",
      "type": "bulk",
      "status": "completed",
      "createdAt": "2026-03-13T10:00:00.000Z"
    }
  ]
}
```

## Validation Rules
- `content`: required for single generation
- `size`: integer, MVP range `128` to `2048`
- `foregroundColor` and `backgroundColor`: valid hex color strings
- `margin`: integer, MVP range `0` to `16`
- `format`: `png` or `svg`
- `errorCorrectionLevel`: `L`, `M`, `Q`, `H`
- `filenamePrefix`: optional, max length `120`
