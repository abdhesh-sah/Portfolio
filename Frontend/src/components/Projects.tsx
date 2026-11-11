import { m, AnimatePresence } from "framer-motion";
import { useProjects, useAuth, useProjectVitals } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { ProjectCard } from "#src/components/projects/ProjectCard";
import { ArrowRight, Folder } from "lucide-react";
import { staggerContainer } from "#src/lib/animation";
import { Link } from "wouter";

export default function Projects() {
  const { data: projects, isLoading, error } = useProjects("default");
  const { data: vitals } = useProjectVitals();
  const { user } = useAuth();
  const { data: settings } = useSiteSettings();

  const allProjects = (Array.isArray(projects) ? projects : []).filter(p => !p.isHidden);

  // Homepage logic: show pinned (isFlagship) projects first
  let displayedProjects = allProjects
    .filter(p => p.isFlagship)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .slice(0, 6);

  const hasNoPinned = displayedProjects.length === 0;

  // Fallback: if no pinned, show 6 most recent (for 3x2 layout)
  if (hasNoPinned) {
    displayedProjects = [...allProjects]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6);
  }

  return (
    <section
      id="projects"
      className="relative py-20 md:py-28 overflow-hidden"
    >
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
         

          <m.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 40%, #ec4899 80%, #00d4ff 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-x 8s ease infinite'
            }}
          >
            {settings?.projectsHeading || "Flagship Projects"}
          </m.h2>

          <m.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            A curated selection of my most significant work and technical case studies.
          </m.p>
        </div>

        {/* Admin Fallback Notice */}
        {hasNoPinned && user && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-xl mx-auto mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm text-center"
          >
            <span className="font-bold">Admin Notice:</span> No projects are marked as flagship. Pin projects from the admin to feature them here. Showing 4 most recent projects as fallback.
          </m.div>
        )}

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="aspect-video rounded-2xl animate-pulse"
                style={{ background: 'rgba(20, 15, 40, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
              />
            ))}
          </div>
        ) : (
          <m.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
          >
            <AnimatePresence mode="popLayout">
              {displayedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  healthStatus={(vitals?.[project.id.toString()] as "up" | "down" | "checking" | "none") || "none"}
                />
              ))}
            </AnimatePresence>
          </m.div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-2">Failed to load projects.</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Please try again later.'}
            </p>
          </div>
        )}

        {(displayedProjects.length === 0 && !isLoading && !error) && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Folder className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No projects available at the moment.</p>
          </m.div>
        )}

        {/* View All Projects Button */}
        {!isLoading && !error && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Link href="/projects">
              <m.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-4 rounded-full font-bold text-foreground transition-all overflow-hidden"
              >
                {/* Background effects */}
                <div className="absolute inset-0 bg-card border border-border group-hover:border-primary/50 transition-colors" />
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <span className="relative z-10 flex items-center gap-3">
                  View All Projects ({allProjects.length})
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </m.button>
            </Link>
          </m.div>
        )}
      </div>
    </section>
  );
}
