// ============================================================
// FILE: src/seed.ts
// ============================================================
import "dotenv/config";
import { projectService } from "./services/project.service.js";
import { skillService } from "./services/skill.service.js";
import { skillConnectionService } from "./services/skill-connection.service.js";
import { mindsetService } from "./services/mindset.service.js";
import { experienceService } from "./services/experience.service.js";
import { settingsService } from "./services/settings.service.js";
import { testimonialService } from "./services/testimonial.service.js";
import { portfolioServiceService } from "./services/portfolio-service.service.js";
import type { Project, InsertProject, InsertSiteSettings, InsertTestimonial, InsertService } from "@portfolio/shared";

import seedData from "./seed-data.json" with { type: "json" };
import { logger } from "./lib/logger.js";

function logSeed(message: string, level: "info" | "error" | "warn" = "info") {
  if (level === "error") {
    logger.error({ context: "seed" }, message);
  } else if (level === "warn") {
    logger.warn({ context: "seed" }, message);
  } else {
    logger.info({ context: "seed" }, message);
  }
}

export async function seedDatabase() {
  try {
    let existingProjects: Project[] = [];
    try {
      existingProjects = await projectService.getAll();
    } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      logSeed("Tables don't exist yet or database empty, proceeding with seeding...");
    }

    if (existingProjects.length > 0) {
      logSeed("Database has existing projects, updating/merging data...");
    }

    logSeed("Starting database seed...");

    const currentYear = new Date().getFullYear();
    const rawSiteSettings = seedData.siteSettings;
    
    type RawCard = { icon: string; label: string; value: string; color?: unknown };

    const normalizeColor = (c?: unknown): "cyan" | "purple" | undefined => {
      if (c === "cyan" || c === "purple") return c;
      return undefined;
    };

    const siteSettingsSeed: InsertSiteSettings = {
      ...rawSiteSettings,
      aboutInfoCards: (rawSiteSettings.aboutInfoCards ?? []).map((card: RawCard) => ({
        icon: card.icon,
        label: card.label,
        value: card.value,
        color: normalizeColor(card.color),
      })),
      footerCopyright: `© ${currentYear} Abdhesh Sah. All rights reserved.`,
    };

    try {
      await settingsService.updateSettings(siteSettingsSeed);
      logSeed("Seeded site settings");
    } catch (err) {
      logSeed(`Failed to seed site settings: ${err}`, "error");
    }

    const projectList: InsertProject[] = seedData.projects as unknown as InsertProject[];

    let successCount = 0;
    let failCount = 0;

    for (const proj of projectList) {
      try {
        const existing = existingProjects.find(p => p.title === proj.title);
        if (existing) {
          await projectService.update(existing.id, proj);
          logSeed(`Updated project: ${proj.title} `);
        } else {
          await projectService.create(proj);
          logSeed(`Seeded project: ${proj.title} `);
        }
        successCount++;
      } catch (err) {
        logSeed(`Failed to process project: ${proj.title} - ${err} `, "error");
        failCount++;
      }
    }

    logSeed(`Projects: ${successCount} processed`);

    const skillList = seedData.skills;

    const existingSkills = await skillService.getAll();
    for (const skill of skillList) {
      try {
        const existing = existingSkills.find(s => s.name === skill.name);
        if (existing) {
          await skillService.update(existing.id, skill as Parameters<typeof skillService.update>[1]);
          logSeed(`Updated skill: ${skill.name} `);
        } else {
          await skillService.create(skill as Parameters<typeof skillService.create>[0]);
          logSeed(`Seeded skill: ${skill.name} `);
        }
        successCount++;
      } catch (err) {
        logSeed(`Failed to process skill: ${skill.name} - ${err} `, "error");
        failCount++;
      }
    }

    logSeed(`Skills: ${successCount} processed`);

    // Add Skill Connections
    const connectionData = [
      { fromName: "C", toName: "C++" },
      { fromName: "HTML", toName: "CSS" },
      { fromName: "CSS", toName: "JavaScript" },
      { fromName: "JavaScript", toName: "React" },
      { fromName: "Git", toName: "GitHub" },
      { fromName: "Node.js", toName: "Express" },
      { fromName: "Express", toName: "PostgreSQL" },
    ];

    const allSkillsAfterSeeding = await skillService.getAll();
    const skillNameToId = new Map(allSkillsAfterSeeding.map(s => [s.name, s.id]));

    const existingConnections = await skillConnectionService.getAll();
    for (const data of connectionData) {
      try {
        const fromSkillId = skillNameToId.get(data.fromName);
        const toSkillId = skillNameToId.get(data.toName);

        if (!fromSkillId || !toSkillId) {
          logSeed(`Could not find skills for connection: ${data.fromName} -> ${data.toName}, skipping...`, "warn");
          continue;
        }

        const exists = existingConnections.some(
          c => c.fromSkillId === fromSkillId && c.toSkillId === toSkillId
        );
        if (exists) {
          logSeed(`Connection already exists: ${data.fromName} -> ${data.toName}, skipping... `);
          continue;
        }
        await skillConnectionService.create(fromSkillId, toSkillId);
        logSeed(`Seeded connection: ${data.fromName} -> ${data.toName} `);
      } catch (err) {
        logSeed(`Failed to seed connection: ${err} `, "error");
      }
    }

    const mindsetList = seedData.mindsets;

    const currentMindsets = await mindsetService.getAll();
    for (const mindset of mindsetList) {
      try {
        const existing = currentMindsets.find(i => i.title === mindset.title);
        if (existing) {
          logSeed(`Mindset already exists, skipping: ${mindset.title} `);
          continue;
        }
        await mindsetService.create(mindset);
        logSeed(`Seeded mindset: ${mindset.title} `);
      } catch (err) {
        logSeed(`Failed to seed mindset: ${err} `, "error");
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experienceList = (seedData.experiences as any[]).map((exp: any) => ({
      ...exp,
      startDate: new Date(exp.startDate)
    }));

    const currentExperiences = await experienceService.getAll();
    successCount = 0;
    failCount = 0;

    for (const exp of experienceList) {
      try {
        const existing = currentExperiences.find(e => e.role === exp.role && e.organization === exp.organization);
        if (existing) {
          logSeed(`Experience already exists, skipping: ${exp.role} `);
          continue;
        }
        await experienceService.create(exp);
        logSeed(`Seeded experience: ${exp.role} `);
        successCount++;
      } catch (err) {
        logSeed(`Failed to seed experience: ${exp.role} - ${err} `, "error");
        failCount++;
      }
    }

    logSeed(`Experiences: ${successCount} seeded (${failCount} failed)`);

    const testimonialList = seedData.testimonials;
    const currentTestimonials = await testimonialService.getAll();
    for (const t of testimonialList) {
      try {
        if (currentTestimonials.find(ex => ex.name === t.name)) {
          logSeed(`Testimonial already exists, skipping: ${t.name} `);
          continue;
        }
        await testimonialService.create(t as InsertTestimonial);
        logSeed(`Seeded testimonial: ${t.name} `);
      } catch (err) {
        logSeed(`Failed to seed testimonial: ${t.name} - ${err} `, "error");
      }
    }

    const serviceList = seedData.services;
    const currentServices = await portfolioServiceService.getAll();
    for (const s of serviceList) {
      try {
        if (currentServices.find(ex => ex.title === s.title)) {
          logSeed(`Service already exists, skipping: ${s.title} `);
          continue;
        }
        await portfolioServiceService.create(s as InsertService);
        logSeed(`Seeded service: ${s.title} `);
      } catch (err) {
        logSeed(`Failed to seed service: ${s.title} - ${err} `, "error");
      }
    }

    logSeed("Database seeding completed successfully!");
  } catch (err) {
    logSeed(`Database seeding failed: ${err} `, "error");
    throw err;
  }
}

// Run only when executed directly (not when imported)
const isMainModule = process.argv[1]?.replace(/\\/g, '/').includes('seed');
if (isMainModule) {
  const isProduction = process.env.NODE_ENV === "production";
  const forceSeed = process.env.FORCE_SEED === "true";

  if (isProduction && forceSeed) {
    logger.error({ context: "seed" }, "CRITICAL: FORCE_SEED=true is prohibited in production to prevent data loss. Aborting.");
    process.exit(1);
  }

  seedDatabase()
    .then(() => {
      logger.info({ context: "seed" }, "Seeding complete. Exiting...");
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ context: "seed", error: err }, "Seeding failed");
      process.exit(1);
    });
}
