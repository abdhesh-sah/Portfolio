# Database Entity Relationship Diagram (ERD)

This document describes the database schema used in the Portfolio project, managed via Drizzle ORM.

## Overview

The database uses PostgreSQL with Drizzle ORM. The schema is defined in [schema.ts](../packages/shared/src/schema.ts).

## Tables

### Core Portfolio Tables

#### `users`
System administrators and backend users.
- `id`: serial (PK)
- `username`: varchar(255) (Unique)
- `email`: varchar(255) (Unique)
- `passwordHash`: varchar(255) (Auth)
- `role`: varchar(50) ('admin', 'author', 'viewer')
- `permissions`: jsonb (string[])
- `status`: varchar(50) ('active', 'suspended', 'pending')
- `createdAt`: timestamp
- `updatedAt`: timestamp

#### `projects`
Stores portfolio projects and their metadata.
- `id`: serial (PK)
- `title`: varchar(255)
- `slug`: varchar(255) (Unique)
- `description`: text
- `longDescription`: text
- `techStack`: jsonb (string[])
- `imageUrl`: varchar(500)
- `githubUrl`: varchar(500)
- `liveUrl`: varchar(500)
- `category`: varchar(100)
- `displayOrder`: integer
- `status`: varchar(50) ('In Progress', 'Completed', 'Archived')
- `problemStatement`: text
- `motivation`: text
- `systemDesign`: text
- `challenges`: text
- `learnings`: text
- `isFlagship`: boolean
- `isHidden`: boolean
- `impact`: text
- `role`: text
- `imageAlt`: text
- `viewCount`: integer
- `healthCheckUrl`: varchar(500)
    > **Security Requirement**: When used by the automated health check component (`vitals.service`) to periodically ping projects, explicitly apply proper SSRF prevention measures: enforce http/https protocols only, apply destination allowlisting or CIDR network restrictions, implement safe DNS resolution to block private IP space, add timeouts and rate limits, and sanitize response logging.
- `summary`: text
- `createdAt`: timestamp
- `updatedAt`: timestamp

#### `skills`
Technical skills inventory.
- `id`: serial (PK)
- `name`: varchar(100)
- `category`: varchar(100)
- `status`: varchar(100) ('Core', 'Advanced', 'Learning')
- `icon`: varchar(100)
- `description`: text
- `proof`: text
- `mastery`: integer
- `x`: real
- `y`: real
- `endorsements`: integer

#### `skill_connections`
Many-to-many relationship mapping between skills.
- `id`: serial (PK)
- `fromSkillId`: integer (FK -> skills.id)
- `toSkillId`: integer (FK -> skills.id)
- **Constraint**: Unique index on `(fromSkillId, toSkillId)` to prevent duplicate connections.

#### `experiences`
Professional and educational history.
- `id`: serial (PK)
- `role`: varchar(200)
- `organization`: varchar(200)
- `period`: varchar(100)
- `startDate`: timestamp
- `endDate`: timestamp
- `description`: text
- `type`: varchar(100) ('Experience', 'Education', etc.)

#### `services`
Offerings for clients.
- `id`: serial (PK)
- `title`: varchar(255)
- `summary`: text
- `category`: varchar(100)
- `tags`: jsonb (string[])
- `displayOrder`: integer
- `isFeatured`: boolean
- `priceMin`: integer
- `priceMax`: integer
- `ctaUrl`: varchar(500)

### Content & Communication

#### `articles`
Blog posts and write-ups.
- `id`: serial (PK)
- `title`: varchar(255)
- `slug`: varchar(255) (Unique)
- `content`: text
- `excerpt`: text
- `featuredImage`: varchar(500)
- `status`: varchar(50) ('draft', 'published', 'archived')
- `publishedAt`: timestamp
- `viewCount`: integer
- `readTimeMinutes`: integer
- `metaTitle`: varchar(255)
- `metaDescription`: text
- `authorId`: integer (FK -> users.id, ON DELETE SET NULL). Articles are retained and anonymized (author becomes NULL) if the original user is deleted.
- `featuredImageAlt`: text
- `reactions`: jsonb (Record<string, number>)
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `searchVector`: tsvector

#### `article_tags`
Tags associated with articles.
- `id`: serial (PK)
- `articleId`: integer (FK -> articles.id)
- `tag`: varchar(100)

#### `messages`
Contact form submissions.

> **PII Handling**: Data stored in this table may contain personally identifiable information (PII). Ensure compliance with GDPR/CCPA by:
> 1. Enforcing a 90-day retention policy via `retentionDate` (automatically purging older records).
> 2. Supporting data subject rights via `deletedAt` (soft delete/right to be forgotten) and `consentStatus`.
> 3. Encrypting sensitive contact data at rest and securing access via strict role-based access control.
> 4. Auditing all access to these records in `audit_log`.

- `id`: serial (PK)
- `name`: varchar(255)
- `email`: varchar(255)
- `subject`: varchar(500)
- `message`: text
- `projectType`: varchar(100)
- `budget`: varchar(100)
- `timeline`: varchar(100)
- `createdAt`: timestamp
- `retentionDate`: timestamp (Purge scheduling)
- `expiresAt`: timestamp (Data expiration)
- `deletedAt`: timestamp (Soft delete)
- `consentStatus`: varchar(50) ('pending', 'granted', 'withdrawn')
- `consentGiven`: boolean

#### `guestbook`
Visitor comments.
- `id`: serial (PK)
- `name`: varchar(255)
- `content`: text
- `email`: varchar(255)
- `isApproved`: boolean
- `reactions`: jsonb (Record<string, number>)
- `createdAt`: timestamp

#### `subscribers`
Newsletter/Update subscribers.
- `id`: serial (PK)
- `email`: varchar(255) (Unique)
- `status`: varchar(50) ('active', 'unsubscribed')
- `source`: varchar(100)
- `createdAt`: timestamp

### System & Meta

#### `site_settings`
Global configuration for the portfolio.
- `id`: serial (PK)
- `singleton_guard`: integer (Unique, Default: 1) - **Enforces single-row configuration**.
- `isOpenToWork`: boolean
- `availabilityStatus`: varchar(255)
- `updatedAt`: timestamp
- `personalName`: varchar(255)
- `personalTitle`: varchar(255)
- `personalBio`: text
- `personalAvatar`: varchar(500)
- `resumeUrl`: varchar(500)
- `whyHireMeData`: jsonb
- `socialGithub`: varchar(500)
- `socialLinkedin`: varchar(500)
- `socialTwitter`: varchar(500)
- `socialInstagram`: varchar(500)
- `socialFacebook`: varchar(500)
- `socialYoutube`: varchar(500)
- `socialDiscord`: varchar(500)
- `socialStackoverflow`: varchar(500)
- `socialDevto`: varchar(500)
- `socialMedium`: varchar(500)
- `socialEmail`: varchar(255)
- `personalPhone`: varchar(255)
- `locationText`: varchar(255)
- `chatbotGreeting`: text
- `heroGreeting`: varchar(255)
- `heroBadgeText`: varchar(255)
- `heroTaglines`: jsonb (string[])
- `heroCtaPrimary`: varchar(255)
- `heroCtaPrimaryUrl`: varchar(500)
- `heroCtaSecondary`: varchar(255)
- `heroCtaSecondaryUrl`: varchar(500)
- `logoText`: varchar(255)
- `navbarLinks`: jsonb
- `footerCopyright`: varchar(255)
- `footerTagline`: varchar(500)
- `sectionOrder`: jsonb (string[])
- `sectionVisibility`: jsonb (Record<string, boolean>)
- `featureBlog`: boolean
- `featureGuestbook`: boolean
- `featureTestimonials`: boolean
- `featureServices`: boolean
- `featurePlayground`: boolean

#### `audit_log`
Tracking administrative actions.
- `id`: serial (PK)
- `action`: varchar(20) ('CREATE', 'UPDATE', 'DELETE', etc.)
- `entity`: varchar(50)
- `entityId`: integer
- `userId`: integer (FK -> users.id)
- `performedBy`: varchar(255) (Human-readable name or system identifier)
- `ipAddress`: varchar(45) (IPv4/IPv6 support)
- `userAgent`: varchar(500) (Client tracing)
- `requestId`: varchar(255) (Transaction tracing)
- `oldValues`: jsonb
- `newValues`: jsonb
- `createdAt`: timestamp

### AI & Modern Features (MF)

#### `code_reviews` (MF-2)
AI-generated analysis of projects.
- `id`: serial (PK)
- `projectId`: integer (FK -> projects.id)
- `content`: text
- `badges`: jsonb (string[])
- `status`: varchar(50) ('pending', 'processing', 'completed', 'failed')
- `error`: text
- `createdAt`: timestamp

#### `case_studies` (MF-3)
AI-generated deep-dives into projects.
- `id`: serial (PK)
- `projectId`: integer (FK -> projects.id)
- `title`: varchar(255)
- `slug`: varchar(255) (Unique)
- `content`: text
- `status`: varchar(50) ('draft', 'published')
- `generatedAt`: timestamp
- `createdAt`: timestamp
- `updatedAt`: timestamp



#### `sketchpad_sessions` (MF-5)
Creative whiteboard tool data.
- `id`: serial (PK)
- `title`: varchar(255)
- `canvasData`: jsonb
- `status`: varchar(50) ('active', 'archived')
- `createdBy`: varchar(255)
- `createdAt`: timestamp
- `updatedAt`: timestamp

#### `chat_conversations`
History for the portfolio AI chatbot.
- `id`: serial (PK)
- `sessionId`: varchar(255)
- `messages`: jsonb ({role: string, content: string}[])
- `metadata`: jsonb
- `createdAt`: timestamp

#### `reading_list`
Curated resources and recommendations.
- `id`: serial (PK)
- `title`: varchar(255)
- `url`: varchar(500)
- `note`: text
- `type`: varchar(50) ('article', 'video', 'book', 'other')
- `createdAt`: timestamp
