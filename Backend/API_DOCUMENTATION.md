# Portfolio API Documentation (v1)

This document provides a comprehensive overview of the Portfolio Backend API (v1).

## Authentication & Authorization

The API uses **Session-based authentication** with specialized middleware for Admin access.

- **Admin Routes**: Require a valid admin session.
- **CSRF Protection**: Applied to all state-changing requests (`POST`, `PUT`, `DELETE`).
- **Rate Limiting**: Applied to sensitive endpoints like `/auth/login` and AI generation.

---

## Core Content Endpoints

### Projects
- `GET /projects`: List all public projects.
- `GET /projects/:slug`: Get detailed project info by slug.
- `GET /projects/category/:category`: Filter projects by category.
- `POST /projects/:id/view`: Increment project view count.

### Articles (Blog)
- `GET /articles`: List all published articles.
- `GET /articles/:slug`: Get article content and metadata by slug.
- `GET /articles/search?q=query`: Search articles using full-text search.
- `POST /articles/:id/react`: Add a reaction to an article.
- `POST /articles/:id/view`: Increment article view count.

### Technical Expertise
- `GET /skills`: Get all skills and their mapping data.
- `GET /experiences`: Get professional and educational history.
- `GET /services`: Get available service offerings.
- `GET /testimonials`: Get client and colleague testimonials.

---

## Communication & Engagement

### Contact & Interaction
- `POST /messages`: Submit a contact form message (Includes honeypot spam protection).
- `POST /guestbook`: Post a new entry to the guestbook (Requires manual approval).
- `GET /guestbook`: List approved guestbook entries.
- `POST /guestbook/:id/react`: Add a reaction to a guestbook entry.

### Newsletters
- `POST /subscribers`: Subscribe to updates/newsletter.
- `DELETE /subscribers/:token`: Unsubscribe using a secure token sent via email.

### AI Features (Modern Features)
- `POST /chat`: Interact with the Portfolio AI Assistant.
- `POST /cover-letter/generate`: Generate a tailored cover letter using AI based on a job description and the owner's portfolio context. (Rate limited: 10/hour).
- `GET /review/project/:id`: Get AI-generated code review/analysis for a project.
- `GET /case-study/:slug`: Get an AI-generated case study for a project.

---

## System & Utilities

### Search
- `GET /search?q=query`: Global search across projects and articles.

### SEO & Metadata
- `GET /seo/:pageSlug`: Get SEO metadata for a specific page.
- `GET /sitemap`: Generates a dynamic XML sitemap.
- `GET /og/:type/:id`: Dynamic OpenGraph image generator (e.g., for projects or articles).

### Feeds
- `GET /feed/rss`: RSS 2.0 Feed.
- `GET /feed/atom`: Atom Feed.
- `GET /feed/json`: JSON Feed.

---

## Administrative Endpoints (Protected)

These routes require **Admin authentication** and typically start with specific registration patterns or are grouped under `/admin`.

### Content Management (CRUD)
The Admin can Create, Read, Update, and Delete:
- Projects (`/projects`)
- Skills (`/skills`)
- Experiences (`/experiences`)
- Articles (`/articles`)
- Services (`/services`)
- Site Settings (`/settings`)
- Guestbook Entries (`/admin/guestbook`)

### System Monitoring
- `GET /admin/audit-log`: View administrative action logs.
- `GET /analytics/stats`: Dashboard statistics (views, device types, locations).
- `POST /upload`: Secure file upload for project images and assets.

---

## Error Handling

The API returns standard HTTP status codes:
- `200 OK`: Success.
- `201 Created`: Resource created.
- `400 Bad Request`: Validation error (Zod-based validation).
- `401 Unauthorized`: Authentication required.
- `403 Forbidden`: Insufficient permissions or CSRF failure.
- `404 Not Found`: Resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unexpected server error.
