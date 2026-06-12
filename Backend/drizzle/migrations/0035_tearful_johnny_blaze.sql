-- Fix skill_connections foreign key constraints to ON DELETE CASCADE
ALTER TABLE "skill_connections" DROP CONSTRAINT IF EXISTS "skill_connections_fromSkillId_skills_id_fk";
ALTER TABLE "skill_connections" DROP CONSTRAINT IF EXISTS "skill_connections_toSkillId_skills_id_fk";

ALTER TABLE "skill_connections" ADD CONSTRAINT "skill_connections_fromSkillId_skills_id_fk"
FOREIGN KEY ("fromSkillId") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "skill_connections" ADD CONSTRAINT "skill_connections_toSkillId_skills_id_fk"
FOREIGN KEY ("toSkillId") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint

-- Remove client portal tables
DROP TABLE IF EXISTS "client_feedback" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "client_projects" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "clients" CASCADE;