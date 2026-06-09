import { pgTable, text, integer, varchar, timestamp, jsonb, real, boolean, serial, index, customType, check, unique } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";

const tsvectorType = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});
import { z } from "zod";

// ================= CONSTANTS =================
export const DEFAULT_SECTION_ORDER = [
  "hero", "about", "skills", "whyhireme", "services", "mindset",
  "projects", "practice", "experience", "guestbook", "contact", "testimonials"
] as const;

// ================= DATABASE TABLES =================

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  longDescription: text("longDescription"),
  techStack: jsonb("techStack").$type<string[]>().notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  githubUrl: varchar("githubUrl", { length: 500 }),
  liveUrl: varchar("liveUrl", { length: 500 }),
  category: varchar("category", { length: 100 }).notNull(),
  displayOrder: integer("displayOrder").notNull().default(0),
  status: varchar("status", { length: 50 }).$type<"In Progress" | "Completed" | "Archived">().notNull().default("Completed"),
  problemStatement: text("problemStatement"),
  motivation: text("motivation"),
  systemDesign: text("systemDesign"),
  challenges: text("challenges"),
  learnings: text("learnings"),
  isFlagship: boolean("isFlagship").notNull().default(false),
  isHidden: boolean("isHidden").notNull().default(false),
  impact: text("impact"),
  role: text("role"),
  imageAlt: text("imageAlt"),
  viewCount: integer("viewCount").notNull().default(0),
  healthCheckUrl: varchar("healthCheckUrl", { length: 500 }),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => {
  return {
    categoryIdx: index("projects_category_idx").on(table.category),
    orderIdx: index("projects_order_idx").on(table.displayOrder),
    slugIdx: index("projects_slug_idx").on(table.slug),
  };
});

export const skillsTable = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  status: varchar("status", { length: 100 }).$type<"Core" | "Advanced" | "Learning">().notNull().default("Core"),
  icon: varchar("icon", { length: 100 }).notNull().default("Code"),
  description: text("description").notNull().default(""),
  proof: text("proof").notNull().default(""),
  mastery: integer("mastery").notNull().default(0),
  x: real("x").notNull().default(50),
  y: real("y").notNull().default(50),
  endorsements: integer("endorsements").notNull().default(0),
});

export const skillConnectionsTable = pgTable("skill_connections", {
  id: serial("id").primaryKey(),
  fromSkillId: integer("fromSkillId").notNull().references(() => skillsTable.id, { onDelete: "cascade" }),
  toSkillId: integer("toSkillId").notNull().references(() => skillsTable.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    unq: unique("skill_connections_fromSkillId_toSkillId_unique").on(table.fromSkillId, table.toSkillId),
  };
});

export const experiencesTable = pgTable("experiences", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 200 }).notNull(),
  organization: varchar("organization", { length: 200 }).notNull(),
  period: varchar("period", { length: 100 }),
  startDate: timestamp("startDate").notNull().defaultNow(),
  endDate: timestamp("endDate"), // Nullable for current roles
  description: text("description").notNull(),
  type: varchar("type", { length: 100 }).notNull().default("Experience"),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull().default(""),
  message: text("message").notNull(),
  projectType: varchar("projectType", { length: 100 }), // Optional for project inquiries
  budget: varchar("budget", { length: 100 }),
  timeline: varchar("timeline", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  // PII & Retention Support (MF-4)
  retentionDate: timestamp("retentionDate"), // When this record should be purged
  expiresAt: timestamp("expiresAt"), // When this record is considered "expired"
  deletedAt: timestamp("deletedAt"), // Soft delete
  consentStatus: varchar("consentStatus", { length: 50 }).$type<"given" | "pending" | "withdrawn" | "declined">().notNull().default("pending"),
  consentGiven: boolean("consentGiven").notNull().default(false),
}, (_table) => {
  return {
    consentCheck: check("messages_consent_consistency", sql`("consentStatus" = 'given' AND "consentGiven" = true) OR ("consentStatus" IN ('pending', 'declined', 'withdrawn') AND "consentGiven" = false)`),
  };
});

export const mindsetTable = pgTable("mindset", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 100 }).notNull().default("Brain"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
});

export const analyticsTable = pgTable("analytics", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).$type<"page_view" | "project_view" | "contact_form" | "resume_download" | "vital">().notNull(), // page_view, project_view, contact_form
  targetId: integer("targetId").references(() => projectsTable.id, { onDelete: "set null" }), // ID of project for project_view
  path: varchar("path", { length: 500 }).notNull(),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  device: varchar("device", { length: 50 }), // mobile, desktop
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  referral: varchar("referral", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    typeIdx: index("analytics_type_idx").on(table.type),
    createdIdx: index("analytics_created_at_idx").on(table.createdAt),
  };
});

export const guestbookTable = pgTable("guestbook", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  email: varchar("email", { length: 255 }), // Optional
  isApproved: boolean("isApproved").notNull().default(false),
  reactions: jsonb("reactions").$type<Record<string, number>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emailTemplatesTable = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});


export const seoSettingsTable = pgTable("seo_settings", {
  id: serial("id").primaryKey(),
  pageSlug: varchar("pageSlug", { length: 100 }).notNull().unique(),
  metaTitle: varchar("metaTitle", { length: 60 }).notNull(),
  metaDescription: text("metaDescription").notNull(),
  ogTitle: varchar("ogTitle", { length: 255 }),
  ogDescription: text("ogDescription"),
  ogImage: varchar("ogImage", { length: 500 }),
  keywords: text("keywords"),
  canonicalUrl: varchar("canonicalUrl", { length: 500 }),
  noindex: boolean("noindex").default(false),
  twitterCard: varchar("twitter_card", { length: 50 }).default("summary_large_image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  featuredImage: varchar("featuredImage", { length: 500 }),
  status: varchar("status", { length: 50 }).$type<"draft" | "published" | "archived">().notNull().default("draft"),
  publishedAt: timestamp("publishedAt"),
  viewCount: integer("viewCount").notNull().default(0),
  readTimeMinutes: integer("readTimeMinutes").notNull().default(0),
  metaTitle: varchar("metaTitle", { length: 255 }),
  metaDescription: text("metaDescription"),
  authorId: integer("authorId").references(() => usersTable.id, { onDelete: "set null" }), // Added FK constraint
  featuredImageAlt: text("featuredImageAlt"),
  reactions: jsonb("reactions").$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  searchVector: tsvectorType("search_vector"),
}, (table) => {
  return {
    statusIdx: index("articles_status_idx").on(table.status),
    slugIdx: index("articles_slug_idx").on(table.slug), // though unique, status filtering is common
    authorIdIdx: index("articles_authorId_idx").on(table.authorId),
  };
});

export const articleTagsTable = pgTable("article_tags", {
  id: serial("id").primaryKey(),
  articleId: integer("articleId").notNull().references(() => articlesTable.id, { onDelete: 'cascade' }),
  tag: varchar("tag", { length: 100 }).notNull(),
});

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  displayOrder: integer("displayOrder").notNull().default(0),
  isFeatured: boolean("isFeatured").notNull().default(false),
  priceMin: integer("priceMin"),
  priceMax: integer("priceMax"),
  ctaUrl: varchar("ctaUrl", { length: 500 }),
}, (table) => {
  return {
    categoryIdx: index("services_category_idx").on(table.category),
    orderIdx: index("services_order_idx").on(table.displayOrder),
  };
});

export const scopeRequestsTable = pgTable("scope_requests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  description: text("description").notNull(),
  projectType: varchar("projectType", { length: 100 }),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  estimation: jsonb("estimation").$type<{
    summary: string;
    hours: { min: number; max: number };
    cost: { min: number; max: number; currency: string };
    milestones: { title: string; duration: string; description: string }[];
    techSuggestions: string[];
  }>(),
  status: varchar("status", { length: 50 }).$type<"pending" | "processing" | "completed" | "failed">().notNull().default("pending"),
  error: text("error"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ================= MF-2: AI PROJECT ANALYSIS =================
export const codeReviewsTable = pgTable("code_reviews", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  status: varchar("status", { length: 50 }).$type<"pending" | "processing" | "completed" | "failed">().notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    processingIdx: index("code_reviews_processing_idx").on(table.projectId).where(sql`status = 'processing'`),
  };
});

// ================= MF-3: AUTO CASE STUDIES =================
export const caseStudiesTable = pgTable("case_studies", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).$type<"draft" | "published">().notNull().default("draft"),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ================= MF-4: CLIENT PORTAL =================
export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  company: varchar("company", { length: 255 }),
  tokenHash: varchar("tokenHash", { length: 255 }).unique(), // SHA-256 for O(1) matching
  status: varchar("status", { length: 50 }).$type<"active" | "inactive">().notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    tokenHashIdx: index("clients_token_hash_idx").on(table.tokenHash),
  };
});

export const clientProjectsTable = pgTable("client_projects", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).$type<"not_started" | "in_progress" | "review" | "completed">().notNull().default("not_started"),
  deadline: timestamp("deadline"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const clientFeedbackTable = pgTable("client_feedback", {
  id: serial("id").primaryKey(),
  clientProjectId: integer("clientProjectId").notNull().references(() => clientProjectsTable.id, { onDelete: "cascade" }),
  clientId: integer("clientId").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isAdmin: boolean("isAdmin").notNull().default(false),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ================= MF-5: SKETCHPAD =================
export const sketchpadSessionsTable = pgTable("sketchpad_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull().default("Untitled Session"),
  canvasData: jsonb("canvasData").$type<Record<string, unknown>>().default({}),
  status: varchar("status", { length: 50 }).$type<"active" | "archived">().notNull().default("active"),
  createdBy: varchar("createdBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const readingListTable = pgTable("reading_list", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  note: text("note"),
  type: varchar("type", { length: 50 }).$type<"article" | "video" | "book" | "other">().notNull().default("article"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull().default(""),
  quote: text("quote").notNull(),
  relationship: varchar("relationship", { length: 100 }).$type<"Colleague" | "Client" | "Manager">().notNull().default("Colleague"),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  displayOrder: integer("displayOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    orderIdx: index("testimonials_order_idx").on(table.displayOrder),
  };
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // Added auth/authz support
  role: varchar("role", { length: 50 }).notNull().default("viewer"), // admin, author, viewer
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, suspended, pending
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 20 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  performedBy: varchar("performed_by", { length: 255 }), // Name/Identifier of the user
  ipAddress: varchar("ip_address", { length: 45 }), // Supports IPv6
  userAgent: varchar("user_agent", { length: 500 }), // Added system tracing
  requestId: varchar("request_id", { length: 255 }), // Added system tracing
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  retentionUntil: timestamp("retention_until"), // Support data retention policies
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    entityIdx: index("audit_log_entity_idx").on(table.entity),
    userIdIdx: index("audit_log_user_id_idx").on(table.userId),
    createdIdx: index("audit_log_created_at_idx").on(table.createdAt),
  };
});

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  isOpenToWork: boolean("isOpenToWork").notNull().default(true),
  availabilityStatus: varchar("availabilityStatus", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),

  // Personal Branding
  personalName: varchar("personalName", { length: 255 }).default("Your Name"),
  personalTitle: varchar("personalTitle", { length: 255 }).default("Full Stack Developer"),
  personalBio: text("personalBio").default("Passionate about building amazing products"),
  personalAvatar: varchar("personalAvatar", { length: 500 }),
  resumeUrl: varchar("resumeUrl", { length: 500 }),
  whyHireMeData: jsonb("whyHireMeData").$type<{ description: string; skills: string[]; stats: { label: string; value: string }[] }>(),
  aboutAvailability: varchar("aboutAvailability", { length: 255 }).default("Open to Work"),
  aboutDescription: text("aboutDescription").default("Building scalable web systems and analyzing complex algorithms."),
  aboutTechStack: jsonb("aboutTechStack").$type<string[]>().default(["React", "Node.js", "TypeScript", "PostgreSQL", "Tailwind"]),
  aboutTimeline: jsonb("aboutTimeline").$type<{ year: string; title: string; description: string }[]>().default([
    { year: "2024 - Present", title: "Advanced System Design", description: "Deep diving into distributed systems, Docker, and Microservices architecture." },
    { year: "2023", title: "Engineering Core", description: "Mastering Data Structures, Algorithms, and OOP at Tribhuvan University." },
    { year: "2022", title: "Hello World", description: "Started the journey with Python scripting and basic web development." }
  ]),
  aboutInfoCards: jsonb("aboutInfoCards").$type<{ icon: string; label: string; value: string; color?: "cyan" | "purple" }[]>().default([
    { icon: "GraduationCap", label: "Status", value: "B.E. Student" },
    { icon: "Code", label: "Focus Area", value: "Full Stack System Design", color: "purple" },
    { icon: "Cpu", label: "Hardware", value: "Electronics & Comms", color: "purple" },
    { icon: "Target", label: "Goal", value: "Software Engineer" }
  ]),

  // Social Links (10 platforms)
  socialGithub: varchar("socialGithub", { length: 500 }),
  socialLinkedin: varchar("socialLinkedin", { length: 500 }),
  socialTwitter: varchar("socialTwitter", { length: 500 }),
  socialInstagram: varchar("socialInstagram", { length: 500 }),
  socialFacebook: varchar("socialFacebook", { length: 500 }),
  socialYoutube: varchar("socialYoutube", { length: 500 }),
  socialDiscord: varchar("socialDiscord", { length: 500 }),
  socialStackoverflow: varchar("socialStackoverflow", { length: 500 }),
  socialDevto: varchar("socialDevto", { length: 500 }),
  socialMedium: varchar("socialMedium", { length: 500 }),
  socialEmail: varchar("socialEmail", { length: 255 }),
  personalPhone: varchar("personalPhone", { length: 255 }),
  locationText: varchar("locationText", { length: 255 }).default("Kathmandu, Nepal"),

  // Chatbot
  chatbotGreeting: text("chatbotGreeting").default("Hi there! I'm Abdhesh's AI assistant. How can I help you today?"),

  // Blog Section Heading
  blogHeading: varchar("blogHeading", { length: 255 }).default("Blog"),

  // Hero Section
  heroGreeting: varchar("heroGreeting", { length: 255 }).default("Hey, I am"),
  heroBadgeText: varchar("heroBadgeText", { length: 255 }).default("Available for work"),
  heroTaglines: jsonb("heroTaglines").$type<string[]>().default(["Building amazing products", "Solving complex problems"]),

  // Hero CTAs
  heroCtaPrimary: varchar("heroCtaPrimary", { length: 255 }).default("View My Work"),
  heroCtaPrimaryUrl: varchar("heroCtaPrimaryUrl", { length: 500 }).default("#projects"),
  heroCtaSecondary: varchar("heroCtaSecondary", { length: 255 }).default("Get In Touch"),
  heroCtaSecondaryUrl: varchar("heroCtaSecondaryUrl", { length: 500 }).default("#contact"),

  // Branding & Hero (Untangled)
  logoText: varchar("logoText", { length: 255 }).default("Portfolio.Dev"),
  heroHeadingLine1: varchar("heroHeadingLine1", { length: 255 }).default("Start building"),
  heroHeadingLine2: varchar("heroHeadingLine2", { length: 255 }).default("The Future"),

  // Navbar Configuration
  navbarLinks: jsonb("navbarLinks").$type<{ label: string; href: string; icon?: string }[]>().default([]),

  // Footer Configuration
  footerCopyright: varchar("footerCopyright", { length: 255 }).default("© 2024 Your Name. All rights reserved."),
  footerTagline: varchar("footerTagline", { length: 500 }).default("Building the future, one line of code at a time."),

  // Section Ordering & Visibility
  sectionOrder: jsonb("sectionOrder").$type<string[]>().default([...DEFAULT_SECTION_ORDER]),
  sectionVisibility: jsonb("sectionVisibility").$type<Record<string, boolean>>().default({
    hero: true, about: true, projects: true, skills: true, whyhireme: true,
    services: true, mindset: true, practice: true, experience: true,
    testimonials: true, guestbook: true, contact: true
  }),

  // Availability
  availabilitySlots: jsonb("availabilitySlots").$type<{ id: string; startDate: string; endDate: string; status: "available" | "booked" | "unavailable"; label?: string }[]>().default([]),

  // Feature Toggles
  featureBlog: boolean("featureBlog").notNull().default(true),
  featureGuestbook: boolean("featureGuestbook").notNull().default(true),
  featureTestimonials: boolean("featureTestimonials").notNull().default(true),
  featureServices: boolean("featureServices").notNull().default(true),
  featurePlayground: boolean("featurePlayground").notNull().default(false),

  // Section Headings
  aboutHeading: varchar("aboutHeading", { length: 255 }).default("About Me"),
  projectsHeading: varchar("projectsHeading", { length: 255 }).default("Flagship Projects"),
  skillsHeading: varchar("skillsHeading", { length: 255 }).default("Technical Arsenal"),
  whyHireMeHeading: varchar("whyHireMeHeading", { length: 255 }).default("Why Hire Me"),
  servicesHeading: varchar("servicesHeading", { length: 255 }).default("What I Do"),
  mindsetHeading: varchar("mindsetHeading", { length: 255 }).default("Engineering Mindset"),
  practiceHeading: varchar("practiceHeading", { length: 255 }).default("Disciplined Practice"),
  experienceHeading: varchar("experienceHeading", { length: 255 }).default("Professional Journey"),
  testimonialsHeading: varchar("testimonialsHeading", { length: 255 }).default("Client Feedback"),
  guestbookHeading: varchar("guestbookHeading", { length: 255 }).default("Guestbook"),
  contactHeading: varchar("contactHeading", { length: 255 }).default("Get In Touch"),
  singletonGuard: integer("singleton_guard").notNull().default(1).unique(),
}, (_table) => {
  return {
    singletonGuardCheck: check("site_settings_singleton_guard_check", sql`"singleton_guard" = 1`),
  };
});

export const chatConversationsTable = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  messages: jsonb("messages").$type<{ role: "user" | "assistant"; content: string }[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).$type<"active" | "unsubscribed">().notNull().default("active"),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ================= DRIZZLE-ZOD BASE SCHEMAS =================
// Note: Internal table schemas are NOT exported to avoid leaking DB structure (A5).
// Use the manually defined API schemas instead.

export const auditLogSchema = z.object({
  id: z.number(),
  action: z.enum(["CREATE", "UPDATE", "DELETE", "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT", "OTHER"]),
  entity: z.string().min(1).max(50),
  entityId: z.number().nullable().optional(),
  userId: z.number().nullable().optional(),
  performedBy: z.string().max(255).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
  userAgent: z.string().max(500).nullable().optional(),
  requestId: z.string().max(255).nullable().optional(),
  oldValues: z.record(z.unknown()).nullable().optional(),
  newValues: z.record(z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
}).strict();

// ================= CUSTOM API SCHEMAS =================

function isValidUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === "" || url === "#") return true;

  // Allow relative paths and anchor links, but prevent javascript: protocol
  if (url.startsWith("/") || url.startsWith("#")) {
    return !url.toLowerCase().trim().startsWith("javascript:");
  }

  try {
    /* eslint-disable-next-line no-undef */
    const parsed = new URL(url);
    // Only allow safe protocols
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}



// Note: Internal table schemas are NOT exported to avoid leaking DB structure.

export const scopeRequestSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  description: z.string().min(10).max(5000),
  projectType: z.string().max(100).nullable().optional(),
  features: z.array(z.string().max(100)).default([]),
  estimation: z.object({
    summary: z.string(),
    hours: z.object({ min: z.number(), max: z.number() }),
    cost: z.object({ min: z.number(), max: z.number(), currency: z.string() }),
    milestones: z.array(z.object({ title: z.string(), duration: z.string(), description: z.string() })),
    techSuggestions: z.array(z.string()),
  }).nullable().optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  error: z.string().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
}).strict();

export const projectSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  slug: z.string().default(""),
  description: z.string(),
  longDescription: z.string().nullable(),
  techStack: z.array(z.string()),
  imageUrl: z.string().default(""),
  githubUrl: z.string().url().nullable().default(null),
  liveUrl: z.string().max(500).nullable().default(null),
  category: z.string().min(1).max(100),
  displayOrder: z.number().default(0),
  status: z.enum(["In Progress", "Completed", "Archived"]).default("Completed"),
  problemStatement: z.string().max(5000).nullable().default(null),
  motivation: z.string().max(5000).nullable().default(null),
  systemDesign: z.string().max(5000).nullable().default(null),
  challenges: z.string().max(5000).nullable().default(null),
  learnings: z.string().max(5000).nullable().default(null),
  isFlagship: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  impact: z.string().max(5000).nullable().default(null),
  role: z.string().max(5000).nullable().default(null),
  imageAlt: z.string().max(500).nullable().default(null),
  viewCount: z.number().int().default(0),
  healthCheckUrl: z.string().url().nullable().optional(),
  summary: z.string().max(500).nullable().default(null),
  createdAt: z.coerce.date().nullable().optional(),
  updatedAt: z.coerce.date().nullable().optional(),
}).strict();


export const insertProjectApiSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, "invalid slug: only lowercase letters, numbers and hyphens allowed"),
  description: z.string().min(1).max(5000),
  longDescription: z.string().nullable().optional(),
  techStack: z.array(z.string().max(100)).default([]),
  imageUrl: z.string().max(500).refine(v => isValidUrl(v), { message: "Invalid url" }),
  githubUrl: z.string().max(500).nullable().optional(),
  liveUrl: z.string().max(500).nullable().optional(),
  category: z.string().min(1).max(100),
  status: z.enum(["In Progress", "Completed", "Archived"]).default("Completed"),
  problemStatement: z.string().max(5000).nullable().optional(),
  motivation: z.string().max(5000).nullable().optional(),
  systemDesign: z.string().max(5000).nullable().optional(),
  challenges: z.string().max(5000).nullable().optional(),
  learnings: z.string().max(5000).nullable().optional(),
  isFlagship: z.boolean().default(false).optional(),
  isHidden: z.boolean().default(false).optional(),
  impact: z.string().max(5000).nullable().optional(),
  role: z.string().max(5000).nullable().optional(),
  imageAlt: z.string().max(500).nullable().optional(),
  healthCheckUrl: z.string().max(500).nullable().optional().refine(v => isValidUrl(v), { message: "Invalid url" }),
  summary: z.string().max(500).nullable().optional(),
});

export const insertScopeRequestApiSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  description: z.string().min(10).max(5000),
  projectType: z.string().max(100).optional(),
  features: z.array(z.string().max(100)).default([]),
});

export const skillSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  status: z.enum(["Core", "Advanced", "Learning"]),
  icon: z.string().max(100),
  description: z.string().max(1000),
  proof: z.string().max(1000),
  mastery: z.number(),
  x: z.number(),
  y: z.number(),
  endorsements: z.number().int().nonnegative().default(0),
}).strict();

export const insertSkillApiSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  status: z.enum(["Core", "Advanced", "Learning"]).default("Core"),
  icon: z.string().max(100).default("Code"),
  description: z.string().max(1000).default(""),
  proof: z.string().max(1000).default(""),
  mastery: z.number().min(0).max(100).default(0),
  x: z.number().default(50),
  y: z.number().default(50),
  endorsements: z.number().default(0),
}).strict();

export const skillConnectionSchema = z.object({
  id: z.number(),
  fromSkillId: z.number(),
  toSkillId: z.number(),
});

export const mindsetSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000),
  icon: z.string().max(100),
  tags: z.array(z.string()).default([]),
}).strict();

export const insertMindsetApiSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).default(""),
  icon: z.string().max(100).default("Brain"),
  tags: z.array(z.string()).default([]),
});

export const experienceSchema = z.object({
  id: z.number(),
  role: z.string().min(1).max(200),
  organization: z.string().min(1).max(200),
  period: z.string().max(100).nullish(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullish(),
  description: z.string().min(1).max(5000),
  type: z.string().max(100),
}).strict();

export const serviceSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255),
  summary: z.string().min(1).max(5000),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
  displayOrder: z.number().default(0),
  isFeatured: z.boolean().default(false),
  priceMin: z.number().int().positive().nullable().optional(),
  priceMax: z.number().int().positive().nullable().optional(),
  ctaUrl: z.string().max(500).nullable().optional(),
}).strict();

export const insertExperienceApiSchema = z.object({
  role: z.string().min(1).max(200),
  organization: z.string().min(1).max(200),
  period: z.string().max(100).nullable().optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).nullable().optional(),
  description: z.string().min(1).max(5000),
  type: z.string().max(100).default("Experience"),
});

export const insertServiceApiSchema = z.object({
  title: z.string().min(1).max(255),
  summary: z.string().min(1).max(5000),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
  displayOrder: z.number().default(0),
  isFeatured: z.boolean().default(false),
  priceMin: z.number().int().positive().nullable().optional(),
  priceMax: z.number().int().positive().nullable().optional(),
  ctaUrl: z.string().max(500).nullable().optional(),
});

export const insertChatConversationApiSchema = z.object({
  sessionId: z.string().min(1).max(255),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1)
  })).min(1),
});

export const testimonialSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(255),
  company: z.string().max(255),
  quote: z.string().min(1).max(5000),
  relationship: z.enum(["Colleague", "Client", "Manager"]),
  avatarUrl: z.string().max(500).nullable().optional(),
  linkedinUrl: z.string().url().max(500).nullable().optional(),
  displayOrder: z.number().default(0),
  createdAt: z.coerce.date(),
}).strict();

export const insertTestimonialApiSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(255),
  company: z.string().max(255).default(""),
  quote: z.string().min(1).max(5000),
  relationship: z.enum(["Colleague", "Client", "Manager"]).default("Colleague"),
  avatarUrl: z.string().max(500).optional().nullable().transform(v => v === "" ? null : v),
  linkedinUrl: z.string().url().max(500).optional().nullable()
    .or(z.literal("").transform(() => null)), displayOrder: z.number().default(0),
});

export const messageSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  subject: z.string().max(500),
  message: z.string().min(1).max(5000),
  projectType: z.string().max(100).nullable().optional(),
  budget: z.string().max(100).nullable().optional(),
  timeline: z.string().max(100).nullable().optional(),
  retentionDate: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  deletedAt: z.coerce.date().nullable().optional(),
  consentStatus: z.enum(["given", "pending", "declined", "withdrawn"]).default("pending"),
  consentGiven: z.boolean().default(false),
  createdAt: z.coerce.date(),
}).strict();

export const insertMessageApiSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  subject: z.string().max(500).default(""),
  message: z.string().min(1).max(5000),
  projectType: z.string().max(100).optional(),
  budget: z.string().max(100).optional(),
  timeline: z.string().max(100).optional(),
  _bnt_id: z.string().optional(), // Honeypot field for spam prevention
});

export const guestbookSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(5000),
  email: z.string().email().max(255).nullish(),
  isApproved: z.boolean(),
  reactions: z.record(z.string(), z.number()).default({}),
  createdAt: z.coerce.date(),
}).strict();

export const insertGuestbookApiSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(5000),
  email: z.string().email().max(255).nullish(),
});

export const ANALYTICS_EVENT_TYPES = ["page_view", "project_view", "contact_form", "resume_download", "vital"] as const;

export const analyticsSchema = z.object({
  id: z.number(),
  type: z.enum(ANALYTICS_EVENT_TYPES),
  targetId: z.number().nullable().optional(),
  path: z.string().max(500),
  browser: z.string().max(100).nullable().optional(),
  os: z.string().max(100).nullable().optional(),
  device: z.string().max(50).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  createdAt: z.coerce.date(),
}).strict();

export const insertAnalyticsSchema = z.object({
  type: z.enum(ANALYTICS_EVENT_TYPES),
  targetId: z.number().nullable().optional(),
  path: z.string().max(500),
  browser: z.string().max(100).nullable().optional(),
  os: z.string().max(100).nullable().optional(),
  device: z.string().max(50).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  referral: z.string().max(255).nullable().optional(),
});

export const emailTemplateSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  createdAt: z.coerce.date(),
}).strict();

export const insertEmailTemplateApiSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
});

export const seoSettingsSchema = z.object({
  id: z.number(),
  pageSlug: z.string().min(1).max(100),
  metaTitle: z.string().min(1).max(60),
  metaDescription: z.string().min(1).max(160),
  ogTitle: z.string().max(255).nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  ogImage: z.string().url().max(500).nullable().optional(),
  keywords: z.string().nullable().optional(),
  canonicalUrl: z.string().url().max(500).nullable().optional(),
  noindex: z.boolean().default(false),
  twitterCard: z.string().default("summary_large_image"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const insertSeoSettingsApiSchema = z.object({
  pageSlug: z.string().min(1).max(100),
  metaTitle: z.string().min(1).max(60),
  metaDescription: z.string().min(1).max(160),
  ogTitle: z.string().max(255).nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  ogImage: z.string().url().max(500).nullable().optional(),
  keywords: z.string().nullable().optional(),
  canonicalUrl: z.string().url().max(500).nullable().optional(),
  noindex: z.boolean().default(false),
  twitterCard: z.string().default("summary_large_image"),
});

export const subscriberSchema = z.object({
  id: z.number(),
  email: z.string().email().max(255),
  status: z.enum(["active", "unsubscribed"]).default("active"),
  source: z.string().max(100).nullable().optional(),
  createdAt: z.coerce.date(),
}).strict();

export const insertSubscriberApiSchema = z.object({
  email: z.string().email().max(255),
  source: z.string().max(100).optional(),
});

// Common fields for Site Settings to avoid duplication
const siteSettingsBaseSchema = z.object({
  isOpenToWork: z.boolean(),
  availabilityStatus: z.string().max(255).nullish().transform(v => v === "" ? null : v),

  // Personal Branding
  personalName: z.string().max(255).nullish(),
  personalTitle: z.string().max(255).nullish(),
  personalBio: z.string().max(5000).nullish(),
  personalAvatar: z.string().max(500).nullable().optional().refine(isValidUrl, { message: "Invalid URL or path" }).or(z.literal("").transform(() => null)),
  resumeUrl: z.string().max(500).nullable().optional().refine(isValidUrl, { message: "Invalid URL or path" }).or(z.literal("").transform(() => null)),
  whyHireMeData: z.object({
    description: z.string(),
    skills: z.array(z.string()),
    stats: z.array(z.object({
      label: z.string(),
      value: z.string()
    }))
  }).nullable().optional(),
  aboutAvailability: z.string().max(255).nullish(),
  aboutDescription: z.string().max(10000).nullish(),
  aboutTechStack: z.array(z.string()).optional(),
  aboutTimeline: z.array(z.object({
    year: z.string(),
    title: z.string(),
    description: z.string()
  })).optional(),
  aboutInfoCards: z.array(z.object({
    icon: z.string(),
    label: z.string(),
    value: z.string(),
    color: z.enum(["cyan", "purple"]).optional()
  })).optional(),

  // Social Links (10 platforms)
  socialGithub: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialLinkedin: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialTwitter: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialInstagram: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialFacebook: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialYoutube: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialDiscord: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialStackoverflow: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialDevto: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialMedium: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  socialEmail: z.string().email().max(255).nullable().optional().or(z.literal("").transform(() => null)),
  personalPhone: z.string().max(255).nullable().optional().or(z.literal("").transform(() => null)),
  locationText: z.string().max(255).nullable().optional(),

  // Hero Section
  heroGreeting: z.string().max(255).nullish(),
  heroBadgeText: z.string().max(255).nullish(),
  heroTaglines: z.array(z.string()).optional(),

  // Branding & Hero (Untangled)
  logoText: z.string().max(255).nullish(),
  heroHeadingLine1: z.string().max(255).nullish(),
  heroHeadingLine2: z.string().max(255).nullish(),

  // Hero CTAs
  heroCtaPrimary: z.string().max(255).nullish(),
  heroCtaPrimaryUrl: z.string().max(500).nullish().refine(isValidUrl, { message: "Invalid URL or path" }),
  heroCtaSecondary: z.string().max(255).nullish(),
  heroCtaSecondaryUrl: z.string().max(500).nullish().refine(isValidUrl, { message: "Invalid URL or path" }),

  // Appearance & Typography (Removed - Now controlled via index.css)

  // Navbar Configuration
  navbarLinks: z.array(z.object({
    label: z.string(),
    href: z.string(),
    icon: z.string().optional(),
  })).optional(),

  // Footer Configuration
  footerCopyright: z.string().max(255).nullish(),
  footerTagline: z.string().max(500).nullish(),

  // Section Ordering & Visibility
  sectionOrder: z.array(z.string()).optional(),
  sectionVisibility: z.record(z.boolean()).nullish(),

  // Availability
  availabilitySlots: z.array(z.object({
    id: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    status: z.enum(["available", "booked", "unavailable"]),
    label: z.string().optional(),
  })).optional(),

  // Feature Toggles
  featureBlog: z.boolean().optional(),
  featureGuestbook: z.boolean().optional(),
  featureTestimonials: z.boolean().optional(),
  featureServices: z.boolean().optional(),
  featurePlayground: z.boolean().optional(),

  // Chatbot
  chatbotGreeting: z.string().nullish(),

  // Section Headings
  aboutHeading: z.string().max(255).nullish(),
  projectsHeading: z.string().max(255).nullish(),
  skillsHeading: z.string().max(255).nullish(),
  whyHireMeHeading: z.string().max(255).nullish(),
  servicesHeading: z.string().max(255).nullish(),
  mindsetHeading: z.string().max(255).nullish(),
  practiceHeading: z.string().max(255).nullish(),
  experienceHeading: z.string().max(255).nullish(),
  testimonialsHeading: z.string().max(255).nullish(),
  guestbookHeading: z.string().max(255).nullish(),
  contactHeading: z.string().max(255).nullish(),
  blogHeading: z.string().max(255).nullish(),
});

export const siteSettingsSchema = siteSettingsBaseSchema.extend({
  id: z.number(),
  updatedAt: z.coerce.date(),
  singletonGuard: z.literal(1).optional(),
});

export const insertSiteSettingsApiSchema = siteSettingsBaseSchema.partial();


export const articleSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string().nullable().optional(),
  featuredImage: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  publishedAt: z.coerce.date().nullable(),
  viewCount: z.number(),
  readTimeMinutes: z.number(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  authorId: z.number().nullable().optional(),
  featuredImageAlt: z.string().max(500).nullable().optional(),
  reactions: z.record(z.number()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  tags: z.array(z.string()).optional(),
}).strict();

export const articleWithRelatedSchema = articleSchema.extend({
  relatedArticles: z.array(articleSchema).optional(),
});

export const insertArticleApiSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  content: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  featuredImage: z.string().url().max(500).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publishedAt: z.string().nullable().optional(),
  readTimeMinutes: z.number().default(0),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  featuredImageAlt: z.string().max(500).nullable().optional(),
});

export const updateArticleApiSchema = insertArticleApiSchema.partial();

// ================= TYPESCRIPT TYPES =================

export type ScopeRequest = z.infer<typeof scopeRequestSchema>;
export type InsertScopeRequest = z.infer<typeof insertScopeRequestApiSchema>;

export type Project = z.infer<typeof projectSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type SkillConnection = z.infer<typeof skillConnectionSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Mindset = z.infer<typeof mindsetSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
export type SeoSettings = z.infer<typeof seoSettingsSchema>;
export type Article = z.infer<typeof articleSchema>;
export type ArticleWithRelated = z.infer<typeof articleWithRelatedSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type InsertSkillConnection = { id?: number; fromSkillId: number; toSkillId: number; };

export type InsertProject = z.infer<typeof insertProjectApiSchema>;
export type InsertSkill = z.infer<typeof insertSkillApiSchema>;
export type InsertExperience = z.infer<typeof insertExperienceApiSchema>;
export type InsertService = z.infer<typeof insertServiceApiSchema>;
export type InsertMessage = z.infer<typeof insertMessageApiSchema>;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateApiSchema>;
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsApiSchema>;
export type InsertMindset = z.infer<typeof insertMindsetApiSchema>;
export type InsertArticle = z.infer<typeof insertArticleApiSchema>;
export type InsertTestimonial = z.infer<typeof insertTestimonialApiSchema>;
export type GuestbookEntry = z.infer<typeof guestbookSchema>;
export type InsertGuestbookEntry = z.infer<typeof insertGuestbookApiSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsApiSchema>;
export type ChatConversation = InferSelectModel<typeof chatConversationsTable>;
export type Subscriber = InferSelectModel<typeof subscribersTable>;
export type InsertSubscriber = InferInsertModel<typeof subscribersTable>;
export type InsertSubscriberApi = z.infer<typeof insertSubscriberApiSchema>;

export const readingListSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255),
  url: z.string().url().max(500),
  note: z.string().nullable().optional(),
  type: z.enum(["article", "video", "book", "other"]),
  createdAt: z.coerce.date(),
});

export const insertReadingListApiSchema = z.object({
  title: z.string().min(1).max(255),
  url: z.string().url().max(500),
  note: z.string().nullable().optional(),
  type: z.enum(["article", "video", "book", "other"]).default("article"),
});

export type ReadingList = z.infer<typeof readingListSchema>;
export type InsertReadingList = z.infer<typeof insertReadingListApiSchema>;

// Update schemas
export const updateProjectSchema = insertProjectApiSchema.partial();
export const updateSkillSchema = insertSkillApiSchema.partial();
export const updateExperienceSchema = insertExperienceApiSchema.partial();
export const updateTestimonialSchema = insertTestimonialApiSchema.partial();
export const updateArticleSchema = insertArticleApiSchema.partial();
export const updateMindsetSchema = insertMindsetApiSchema.partial();
export const updateServiceSchema = insertServiceApiSchema.partial();

// ================= TYPE GUARDS =================

export function isProject(obj: unknown): obj is Project {
  return projectSchema.safeParse(obj).success;
}
export function isSkill(obj: unknown): obj is Skill {
  return skillSchema.safeParse(obj).success;
}
export function isExperience(obj: unknown): obj is Experience {
  return experienceSchema.safeParse(obj).success;
}
export function isMessage(obj: unknown): obj is Message {
  return messageSchema.safeParse(obj).success;
}
export function isMindset(obj: unknown): obj is Mindset {
  return mindsetSchema.safeParse(obj).success;
}
export function isEmailTemplate(obj: unknown): obj is EmailTemplate {
  return emailTemplateSchema.safeParse(obj).success;
}
export function isSeoSettings(obj: unknown): obj is SeoSettings {
  return seoSettingsSchema.safeParse(obj).success;
}
export function isTestimonial(obj: unknown): obj is Testimonial {
  return testimonialSchema.safeParse(obj).success;
}
export function isGuestbookEntry(obj: unknown): obj is GuestbookEntry {
  return guestbookSchema.safeParse(obj).success;
}
export function isAuditLog(obj: unknown): obj is AuditLog {
  return auditLogSchema.safeParse(obj).success;
}
export function isSubscriber(obj: unknown): obj is Subscriber {
  return subscriberSchema.safeParse(obj).success;
}

// ================= MF-2: Code Review Schemas =================
export const codeReviewSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  content: z.string(),
  badges: z.array(z.string()).default([]),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  error: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});
export type CodeReview = z.infer<typeof codeReviewSchema>;

// ================= MF-3: Case Study Schemas =================
export const caseStudySchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  status: z.enum(["draft", "published"]),
  generatedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CaseStudy = z.infer<typeof caseStudySchema>;

export const insertCaseStudyApiSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  content: z.string().min(1),
  status: z.enum(["draft", "published"]).default("draft"),
});

// ================= MF-4: Client Portal Schemas =================
export const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  company: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
  createdAt: z.coerce.date(),
});
export type Client = z.infer<typeof clientSchema>;

export const insertClientApiSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  company: z.string().max(255).optional().or(z.literal("").transform(() => null)),
});

export const clientProjectSchema = z.object({
  id: z.number(),
  clientId: z.number(),
  title: z.string(),
  status: z.enum(["not_started", "in_progress", "review", "completed"]),
  deadline: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ClientProject = z.infer<typeof clientProjectSchema>;

export const insertClientProjectApiSchema = z.object({
  clientId: z.number(),
  title: z.string().min(1).max(255),
  status: z.enum(["not_started", "in_progress", "review", "completed"]).default("not_started"),
  deadline: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
});

export const clientFeedbackSchema = z.object({
  id: z.number(),
  clientProjectId: z.number(),
  clientId: z.number(),
  message: z.string(),
  attachments: z.array(z.string()).default([]),
  createdAt: z.coerce.date(),
});
export type ClientFeedback = z.infer<typeof clientFeedbackSchema>;

export const insertClientFeedbackApiSchema = z.object({
  clientProjectId: z.number(),
  message: z.string().min(1).max(5000),
});

// ================= MF-5: Sketchpad Schemas =================
export const sketchpadSessionSchema = z.object({
  id: z.number(),
  title: z.string(),
  canvasData: z.record(z.unknown()).default({}),
  status: z.enum(["active", "archived"]),
  createdBy: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SketchpadSession = z.infer<typeof sketchpadSessionSchema>;

export const insertSketchpadSessionApiSchema = z.object({
  title: z.string().min(1).max(255).default("Untitled Session"),
  createdBy: z.string().max(255).optional(),
});
