import { useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { type Project } from "#shared/schema";
import { OptimizedImage } from "#src/components/OptimizedImage";
import { staggerChild } from "#src/lib/animation";
import { ExternalLink, Github, ArrowRight, Folder, Eye, Sparkles, Flame } from "lucide-react";
import { Link } from "wouter";
import { CodeRoastModal } from "./CodeRoastModal";

interface ProjectCardProps {
  project: Project;
  showPinBadge?: boolean;
  priority?: boolean;
  healthStatus?: "up" | "down" | "checking" | "none";
}

// Category colors for glow effects
const categoryColors: Record<string, { glow: string; text: string; bg: string }> = {
  System: { glow: 'rgba(0, 212, 255, 0.5)', text: '#00d4ff', bg: 'rgba(0, 212, 255, 0.1)' },
  Academic: { glow: 'rgba(168, 85, 247, 0.5)', text: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
  Backend: { glow: 'rgba(34, 197, 94, 0.5)', text: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  Utility: { glow: 'rgba(236, 72, 153, 0.5)', text: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
  Web: { glow: 'rgba(59, 130, 246, 0.5)', text: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
};





export function ProjectCard({ project, showPinBadge = true, healthStatus = "none" }: Omit<ProjectCardProps, 'priority'>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [roastOpen, setRoastOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || shouldReduceMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateXValue = (e.clientY - centerY) / 25;
    const rotateYValue = (centerX - e.clientX) / 25;
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const catColor = categoryColors[project.category] || categoryColors.Utility;

  return (
    <>
      <Link href={`/project/${project.id}`}>
      <m.div
        ref={cardRef}
        layout
        variants={staggerChild}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="relative group cursor-pointer outline-none h-full"
        style={{
          transform: shouldReduceMotion
            ? "none"
            : `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.1s ease-out",
        }}
      >
        {/* Outer Glow */}
        <m.div
          animate={{ opacity: isHovered ? 0.6 : 0 }}
          className="absolute -inset-1 rounded-2xl blur-xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle, ${catColor.glow} 0%, transparent 70%)`
          }}
        />

        {/* Card Body */}
        <div
          className="relative rounded-2xl overflow-hidden flex flex-col h-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md border border-primary/20 transition-all duration-300 group-hover:border-primary/50"
          style={{
            boxShadow: isHovered
              ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px ${catColor.glow}`
              : '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Image */}
          <div className="relative aspect-video overflow-hidden">
            {project.imageUrl ? (
              <OptimizedImage
                src={project.imageUrl}
                alt={project.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                width={800}
                height={450}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <Folder className="w-12 h-12 text-slate-600" />
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />

            {/* Pinned Badge */}
            {showPinBadge && project.isFlagship && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
                📌 Pinned
              </div>
            )}

            {/* View Count */}
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-background/40 border border-border text-[10px] text-muted-foreground backdrop-blur-md flex items-center gap-1">
              <Eye className="w-3 h-3" /> {project.viewCount || 0}
            </div>

            {/* Health Status */}
            {healthStatus !== "none" && (
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-background/40 border border-border text-[10px] backdrop-blur-md flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  healthStatus === "up" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : 
                  healthStatus === "down" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : 
                  "bg-yellow-500"
                }`} />
                <span className="font-bold uppercase tracking-tighter text-[9px]">
                  {healthStatus === "up" ? "Live" : healthStatus === "down" ? "Offline" : "Checking"}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5 flex flex-col flex-grow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                {project.title}
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: catColor.bg,
                  color: catColor.text,
                  borderColor: `${catColor.text}40`
                }}
              >
                {project.category}
              </span>
            </div>

            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-grow">
              {project.description}
            </p>

            {project.summary && (
              <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-2.5 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden group/tldr"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">AI Summary</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed italic line-clamp-2">
                  "{project.summary}"
                </p>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 -translate-x-full group-hover/tldr:translate-x-full transition-transform duration-1000" />
              </m.div>
            )}

            {/* Tech Stack */}
            <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
              {project.techStack.slice(0, 5).map((tech) => (
                <m.span
                  key={tech}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary/80 hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-default shadow-sm"
                >
                  {tech}
                </m.span>
              ))}
              {project.techStack.length > 5 && (
                <span className="text-[10px] font-medium text-muted-foreground py-0.5 px-1">
                  +{project.techStack.length - 5}
                </span>
              )}
            </div>

            {/* Links */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="GitHub Repository"
                >
                  <Github className="w-4 h-4" />
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Live Demo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <div className="flex-1" />

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRoastOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all text-[10px] font-bold group/roast"
              >
                <Flame className="w-3.5 h-3.5 group-hover:animate-bounce" />
                AI ROAST
              </button>
            </div>
          </div>
        </div>
      </m.div>
    </Link>

    <CodeRoastModal 
      projectId={project.id} 
      projectTitle={project.title}
      isOpen={roastOpen}
      onClose={() => setRoastOpen(false)}
    />
    </>
  );
}
