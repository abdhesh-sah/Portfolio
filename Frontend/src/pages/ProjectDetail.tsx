import { useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Layers,
  Lightbulb,
  AlertCircle,
  Settings,
  BookOpen,
  Code2,
  Sparkles,
} from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { fadeUp, fadeRight, fadeIn } from "#src/lib/animation";
import { m } from "framer-motion";
import DOMPurify from "dompurify";
import { SEO } from "#src/components/SEO";
import { useProjects, useProjectById } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { getDynamicOgImage } from "#src/lib/cloudinary";
import { toast } from "#src/hooks/use-toast";
import { ApiResponseViewer } from "#src/components/ApiResponseViewer";
import { InteractivePlayground } from "#src/components/InteractivePlayground";
import { FloatingParticles, SectionCard, TechBadge, ProjectHero, OtherProjectsSection } from "#src/components/ProjectDetail/ProjectSections";
import { useDwellTime } from "#src/hooks/use-dwell-time";
import { trackProjectEngagement } from "#src/lib/analytics";

const DWELL_THRESHOLDS = [
  { seconds: 30,  label: "warm_read" },
  { seconds: 120, label: "deep_read" },
];

export default function ProjectDetail() {
  const { data: settings } = useSiteSettings();
  const [, params] = useRoute("/project/:id");
  const { data: projects } = useProjects();

  const projectId = parseInt(params?.id || "");
  const { data: project, isLoading } = useProjectById(
    isNaN(projectId) ? null : projectId
  );

  // Hardened deterministic layout slice optimization
  const otherProjects = useMemo(() => {
    if (!projects || !project?.id) return [];
    
    // Filter out the current active asset layout track
    const filtered = projects.filter(p => p.id !== project.id);
    
    // Seed shuffle loop accurately bound to the active ID context to prevent dynamic background jumping
    const pseudoRandomSort = (a: typeof project, b: typeof project) => {
      const scoreA = Math.sin(a.id + project.id);
      const scoreB = Math.sin(b.id + project.id);
      return scoreA - scoreB;
    };

    return [...filtered].sort(pseudoRandomSort).slice(0, 3);
  }, [projects, project?.id]);

  // Persistent optimization anchor configuration tracking layout paths
  const stablePublishDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleDwellMilestone = useCallback(
    (label: string) => {
      if (project?.title) {
        trackProjectEngagement(project.title, label as "warm_read" | "deep_read");
      }
    },
    [project?.title]
  );

  useDwellTime({
    thresholds: DWELL_THRESHOLDS,
    onMilestone: handleDwellMilestone,
    key: params?.id || "global",
    enabled: !!project,
  });

  const [, setLocation] = useLocation();

  const handleBack = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (window.history.length > 2) {
      window.history.back();
    } else {
      setLocation("/#projects");
    }
  };

  const handleShare = async () => {
    if (project) {
      const shareData = {
        title: project.title,
        text: `Check out this project: ${project.title}`,
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          toast({ title: "Shared successfully!" });
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Error sharing:", err);
          }
        }
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copied to clipboard!" });
      }
    }
  };

  const twitterShareUrl = project ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out this project: ${project.title}`)}` : "";
  const linkedinShareUrl = project ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}` : "";
  const whatsappShareUrl = project ? `https://wa.me/?text=${encodeURIComponent(`Check out this project: ${project.title} ${window.location.href}`)}` : "";

  const categoryColors: Record<string, { glow: string; text: string }> = {
    System: { glow: 'rgba(0, 212, 255, 0.3)', text: '#00d4ff' },
    Academic: { glow: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' },
    Backend: { glow: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
    Utility: { glow: 'rgba(236, 72, 153, 0.3)', text: '#ec4899' },
    Web: { glow: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen pt-24 px-4 flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, var(--color-bg-deep, #050510) 0%, var(--color-bg-mid, #0a0520) 50%, var(--color-bg-deep, #050510) 100%)' }}
      >
        <div className="w-full max-w-4xl space-y-8">
          <div className="h-12 rounded-lg animate-pulse" style={{ background: 'rgba(30, 25, 50, 0.5)' }} />
          <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(30, 25, 50, 0.5)' }} />
          <div className="space-y-4">
            <div className="h-8 rounded w-1/4 animate-pulse" style={{ background: 'rgba(30, 25, 50, 0.5)' }} />
            <div className="h-32 rounded animate-pulse" style={{ background: 'rgba(30, 25, 50, 0.5)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div
        className="min-h-screen pt-24 px-4 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(180deg, var(--color-bg-deep, #050510) 0%, var(--color-bg-mid, #0a0520) 50%, var(--color-bg-deep, #050510) 100%)' }}
      >
        <m.div
          {...fadeUp}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-gray-400 mb-8">The project you're looking for doesn't exist.</p>
          <Link href="/">
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(15, 10, 35, 0.9) 100%)',
                border: '1px solid rgba(0, 212, 255, 0.4)',
                color: 'var(--color-cyan)'
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </Link>
        </m.div>
      </div>
    );
  }

  const catColor = categoryColors[project.category] || categoryColors.Utility;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, var(--color-bg-deep, #050510) 0%, var(--color-bg-mid, #0a0520) 30%, var(--color-bg-accent, #0d0525) 60%, var(--color-bg-deep, #050510) 100%)'
      }}
    >
      <SEO
        slug={`project-${project.id}`}
        title={project.title ? `${project.title} | ${settings?.personalName || 'Portfolio'}` : "Project Detail"}
        description={project.description || "Project details and overview."}
        image={getDynamicOgImage(project.title || "Project Detail", project.imageUrl || "")}
        keywords={project.techStack?.join(", ")}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": project.title,
            "description": project.description,
            "url": project.liveUrl || project.githubUrl,
            "applicationCategory": "WebApplication",
            "operatingSystem": "Any",
            "author": {
              "@type": "Person",
              "name": settings?.personalName || "Portfolio Owner"
            },
            "datePublished": stablePublishDate,
            "codeRepository": project.githubUrl,
            "programmingLanguage": project.techStack,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": import.meta.env.VITE_SITE_URL || window.location.origin
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Projects",
                "item": `${import.meta.env.VITE_SITE_URL || window.location.origin}/#projects`
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": project.title,
                "item": `${import.meta.env.VITE_SITE_URL || window.location.origin}/project/${project.id}`
              }
            ]
          }
        ]}
      />

      {/* Background */}
      <div className="absolute inset-0">
        <FloatingParticles />

        {/* Nebula gradients */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 30% 20%, ${catColor.glow} 0%, transparent 50%),
              radial-gradient(ellipse 50% 40% at 70% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)
            `
          }}
        />
      </div>

      <main className="relative z-10 pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Framer Motion Animation block completely wraps layout structures safely */}
          <m.div
            {...fadeUp}
            className="space-y-10"
          >
            <ProjectHero 
              project={project} 
              catColor={catColor}
              handleBack={handleBack}
              handleShare={handleShare}
              twitterShareUrl={twitterShareUrl}
              linkedinShareUrl={linkedinShareUrl}
              whatsappShareUrl={whatsappShareUrl}
            />

            {/* Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Main Content Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Motivation */}
                <SectionCard title="Motivation" icon={Lightbulb} accentColor="#00d4ff">
                  <div
                    className="prose prose-invert max-w-none text-gray-300"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.motivation || project.description) }}
                  />
                </SectionCard>

                {/* Impact */}
                {project.impact && (
                  <SectionCard title="Impact" icon={Sparkles} accentColor="#22c55e" variant="success">
                    <div
                      className="prose prose-invert max-w-none text-gray-300"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.impact) }}
                    />
                  </SectionCard>
                )}

                {/* The Problem */}
                <SectionCard title="The Problem" icon={AlertCircle} accentColor="#ef4444" variant="warning">
                  <div
                    className="prose prose-invert max-w-none text-gray-300"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.problemStatement || "Problem statement not documented yet.") }}
                  />
                </SectionCard>

                {/* System Design */}
                <SectionCard title="System Design" icon={Settings} accentColor="#a855f7">
                  <div
                    className="prose prose-invert max-w-none text-gray-300"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.systemDesign || "System design details coming soon.") }}
                  />
                </SectionCard>

                {/* Interactive Playground */}
                <InteractivePlayground
                  projectId={project.id}
                  projectTitle={project.title}
                  githubUrl={project.githubUrl ?? undefined}
                  liveUrl={project.liveUrl ?? undefined}
                  techStack={project.techStack}
                  description={project.description}
                />

                {/* Challenges, Learnings & Role Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <SectionCard title="Key Challenges" icon={Settings} accentColor="#f59e0b">
                    <div
                      className="prose prose-invert max-w-none text-gray-300 text-sm"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.challenges || "No challenges documented.") }}
                    />
                  </SectionCard>

                  <SectionCard title="Key Learnings" icon={BookOpen} accentColor="#22c55e" variant="success">
                    <div
                      className="prose prose-invert max-w-none text-gray-300 text-sm"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.learnings || "Continuing to learn and iterate.") }}
                    />
                  </SectionCard>
                </div>

                {project.role && (
                  <SectionCard title="My Role" icon={Layers} accentColor="#38bdf8">
                    <div
                      className="prose prose-invert max-w-none text-gray-300 text-sm"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.role) }}
                    />
                  </SectionCard>
                )}
              </div>

              {/* Sidebar Column: Adding items-start to grid forces the parent col to preserve natural bounds, restoring standard layout tracking targets */}
              <div className="lg:col-span-1">
                <m.div
                  initial={fadeRight.initial}
                  animate={fadeRight.animate}
                  transition={{ delay: 0.3 }}
                  className="sticky top-24 rounded-2xl p-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 10, 35, 0.9) 0%, rgba(10, 8, 25, 0.95) 100%)',
                    border: '1px solid rgba(100, 100, 140, 0.2)'
                  }}
                >
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    Technologies Used
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech: string) => (
                      <TechBadge key={tech} tech={tech} />
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-6 pt-6 border-t border-gray-800/50 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Category</span>
                      <span style={{ color: catColor.text }}>{project.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tech Count</span>
                      <span className="text-gray-300">{project.techStack.length}</span>
                    </div>
                    {project.liveUrl && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className="text-green-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          Live
                        </span>
                      </div>
                    )}
                  </div>

                  {/* API Response Viewer — "Proof of Work" */}
                  <div className="mt-6 pt-6 border-t border-gray-800/50">
                    <ApiResponseViewer
                      endpoint={`/api/v1/projects/${project.id}`}
                      data={project}
                      accentColor={catColor.text}
                    />
                  </div>
                </m.div>
              </div>
            </div>

            <OtherProjectsSection 
              projects={(otherProjects || []).map(p => ({
                id: p.id,
                title: p.title,
                description: p.description,
                imageUrl: p.imageUrl
              }))} 
              catColor={catColor} 
            />

            {/* Back to Projects */}
            <m.div
              initial={fadeIn.initial}
              animate={fadeIn.animate}
              transition={{ delay: 0.5 }}
              className="text-center pt-8 border-t border-gray-800/30"
            >
              <Link href="/#projects">
                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all"
                  style={{
                    background: 'rgba(20, 15, 40, 0.6)',
                    border: '1px solid rgba(100, 100, 140, 0.3)',
                    color: 'var(--color-muted-text)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  View All Projects
                </m.button>
              </Link>
            </m.div>
          </m.div>
        </div>
      </main>
    </div>
  );
}