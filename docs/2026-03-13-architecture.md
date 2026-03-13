# QRBulkGen Architecture - March 13, 2026

## Objective
Ship a 2-week MVP with:
- Web app
- Backend API
- Worker for bulk QR generation
- Mobile app MVP
- Dashboard analytics
- Pricing page
- SEO landing pages
- Blog

## Scope Boundaries
### In scope
- Credential-based authentication
- Single QR generation
- Bulk QR generation from CSV
- Shared QR customization options
- Async job processing with ZIP download
- Dashboard with per-user job history and summary metrics
- Mobile app for auth, single generation, job status/history, and dashboard summary
- Marketing pages, pricing, SEO landing pages, blog

### Out of scope
- Payment gateway integration
- Role-based permissions
- Row-level bulk customization
- Cloud object storage
- CMS integration
- Social login

## Services
### Frontend
- Next.js web app
- Owns marketing pages, auth screens, generation flows, dashboard, pricing, blog, and SEO pages
- Calls backend APIs for auth, QR generation, jobs, downloads, and analytics

### Backend
- Express API
- Owns auth, request validation, job creation, single QR generation, job queries, and analytics aggregation
- Writes durable data to Postgres
- Enqueues bulk jobs in Redis/BullMQ
- Sends password reset emails through Resend

### Worker
- BullMQ consumer
- Owns CSV parsing, QR image generation for bulk rows, ZIP packaging, and job status updates

### Mobile
- React Native / Expo app
- Owns auth, single QR generation, dashboard summary, recent jobs, and job detail/status
- Reuses backend APIs

## Infrastructure
### Postgres
Stores:
- users
- qr_jobs
- qr_job_items
- job_artifacts
- analytics data

### Redis
Stores:
- BullMQ queue data
- transient job orchestration state

### Filesystem Storage
Stores:
- generated single QR images
- generated bulk QR images
- ZIP artifacts

MVP requirement:
- Use a storage abstraction so local disk can be replaced later

## Core Flows
### Auth flow
1. User registers or logs in from web or mobile.
2. Backend validates credentials against Postgres.
3. Backend returns an authenticated session/token payload.
4. Client uses the session for protected requests.

### Password reset flow
1. User requests password reset from the frontend.
2. Backend creates an expiring reset token in Postgres.
3. Backend emails a reset link to the registered address using Resend.
4. Frontend reset page submits the token and the new password.
5. Backend updates the password and invalidates prior sessions.

### Single QR flow
1. User submits QR content and customization options.
2. Backend validates payload.
3. Backend generates QR image synchronously.
4. Backend stores artifact metadata and returns download information.
5. Dashboard includes the generation in recent history.

### Bulk QR flow
1. User uploads CSV plus shared customization options.
2. Backend validates file and creates a `queued` job.
3. Backend enqueues the job in BullMQ.
4. Worker processes CSV rows, generates QR images, packages ZIP, and updates counts.
5. User checks status in dashboard and downloads ZIP when complete.

### Dashboard analytics flow
1. Backend aggregates per-user job metrics from Postgres.
2. Web and mobile fetch summary metrics and recent job list.
3. Dashboard shows totals, completion/failure counts, and download availability.

## Ownership Rules
- Single QR generation is synchronous in backend only.
- Bulk generation is asynchronous and must go through worker.
- Validation rules for QR customization must be shared conceptually across web, backend, and mobile.
- Marketing content is web-only.

## Delivery Order
1. Data model and API contracts
2. Backend foundation
3. Auth
4. Single QR generation
5. Bulk job pipeline
6. Dashboard
7. Mobile MVP
8. Pricing, SEO pages, blog
