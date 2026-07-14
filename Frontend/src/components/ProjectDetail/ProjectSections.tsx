import { m } from "framer-motion";
import { fadeUp, scaleInSubtle, fadeLeft, fadeIn, hoverScale, hoverLift, fadeUpLarge } from "#src/lib/animation";
import { useTheme } from "#src/components/theme-provider";
import React from "react";
import { ArrowLeft, ChevronRight, Sparkles, ExternalLink, Share2, MessageCircle, Layers } from "lucide-react";
import { Github, Twitter, Linkedin } from "#src/components/icons/brand-icons";
import { Link } from "wouter";
import { OptimizedImage } from "#src/components/OptimizedImage";

// Simple seeded randomizer for deterministic rendering
const seededRandom = (seed: number) => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

// Floating particles
const PARTICLE_DATA = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: seededRandom(i * 10) * 100,
  y: seededRandom(i * 10 + 1) * 100,
  delay: seededRandom(i * 10 + 2) * 6,
  duration: 10 + seededRandom(i * 10 + 3) * 8,
  size: 2 + seededRandom(i * 10 + 4) * 4,
  color: seededRandom(i * 10 + 5) > 0.5 ? 'cyan' : 'purple'
}));

export const FloatingParticles = () => {
  const { reducedMotion } = useTheme();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_DATA.map((p) => (
        <m.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color === 'cyan'
              ? 'radial-gradient(circle, rgba(0, 212, 255, 0.6) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)'
          }}
          animate={reducedMotion ? { opacity: 0.4 } : {
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.7, 0.2],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

// Section Card Component
export const SectionCard = ({
  title,
  icon: Icon,
  children,
  accentColor = '#00d4ff',
  variant = 'default',
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accentColor?: string;
  variant?: 'default' | 'warning' | 'success';
  className?: string;
}) => {
  const bgColors = {
    default: 'rgba(15, 10, 35, 0.8)',
    warning: 'rgba(239, 68, 68, 0.05)',
    success: 'rgba(34, 197, 94, 0.05)'
  };

  return (
    <m.div
      initial={fadeUp.initial}
      whileInView={fadeUp.animate}
      viewport={{ once: true }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${bgColors[variant]} 0%, rgba(10, 8, 25, 0.9) 100%)`,
        border: `1px solid ${accentColor}25`,
        boxShadow: `0 10px 40px rgba(0, 0, 0, 0.3)`
      }}
    >
      <div
        className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 rounded-tl-2xl"
        style={{ borderColor: `${accentColor}40` }}
      />
      <div
        className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 rounded-br-2xl"
        style={{ borderColor: `${accentColor}40` }}
      />

      <div className="p-6 md:p-8">
        <h3 className="text-xl font-bold flex items-center gap-3 mb-4">
          <div
            className="p-2 rounded-lg"
            style={{
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}30`
            }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <span className="text-white">{title}</span>
        </h3>
        <div className="text-gray-300 leading-relaxed w-full">{children}</div>
      </div>
    </m.div>
  );
};

// Tech Badge Component
export const TechBadge = ({ tech }: { tech: string }) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    React: { bg: 'rgba(0, 212, 255, 0.1)', text: '#00d4ff', border: 'rgba(0, 212, 255, 0.3)' },
    TypeScript: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
    JavaScript: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' },
    Python: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    "Node.js": { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    Express: { bg: 'rgba(100, 100, 140, 0.1)', text: '#8b8ba0', border: 'rgba(100, 100, 140, 0.3)' },
    SQLite: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
    TailwindCSS: { bg: 'rgba(0, 212, 255, 0.1)', text: '#00d4ff', border: 'rgba(0, 212, 255, 0.3)' },
    CSS3: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
    "C++": { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
    C: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  };

  const color = colors[tech] || { bg: 'rgba(100, 100, 140, 0.1)', text: '#8b8ba0', border: 'rgba(100, 100, 140, 0.3)' };

  return (
    <m.span
      {...scaleInSubtle}
      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
      style={{
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        boxShadow: `0 0 15px ${color.bg}`
      }}
    >
      {tech}
    </m.span>
  );
};

export const ProjectHero = ({
  project,
  catColor,
  handleBack,
  handleShare,
  twitterShareUrl,
  linkedinShareUrl,
  whatsappShareUrl
}: {
  project: {
    title: string;
    category: string;
    githubUrl?: string | null;
    liveUrl?: string | null;
    imageUrl?: string | null;
  };
  catColor: {
    text: string;
    glow: string;
  };
  handleBack: (e?: React.MouseEvent) => void;
  handleShare: () => void;
  twitterShareUrl: string;
  linkedinShareUrl: string;
  whatsappShareUrl: string;
}) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
        style={{
          background: 'rgba(20, 15, 40, 0.6)',
          border: '1px solid rgba(100, 100, 140, 0.2)',
          color: 'var(--color-muted-text)'
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <ChevronRight className="w-4 h-4 text-gray-600" />
      <Link href="/#projects">
        <span className="text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">Projects</span>
      </Link>
      <ChevronRight className="w-4 h-4 text-gray-600" />
      <span style={{ color: catColor.text }}>{project.title}</span>
    </div>

    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <m.div
          {...fadeLeft}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{
            background: `${catColor.text}15`,
            border: `1px solid ${catColor.text}40`
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: catColor.text }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: catColor.text }}>
            {project.category}
          </span>
        </m.div>

        <m.h1
          {...fadeIn}
          className="text-4xl md:text-5xl font-bold mb-2"
          style={{
            background: `linear-gradient(135deg, #ffffff 0%, ${catColor.text} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {project.title}
        </m.h1>
      </div>

      <div className="flex flex-wrap gap-3">
        {project.githubUrl && (
          <m.a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            {...hoverScale}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
            style={{
              background: 'rgba(25, 20, 45, 0.8)',
              border: '1px solid rgba(100, 100, 140, 0.3)',
              color: 'var(--color-muted-text)'
            }}
          >
            <Github className="w-4 h-4" />
            Source Code
          </m.a>
        )}
        {project.liveUrl && (
          <m.a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            {...hoverScale}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${catColor.glow} 0%, rgba(15, 10, 35, 0.9) 100%)`,
              border: `1px solid ${catColor.text}50`,
              color: catColor.text,
              boxShadow: `0 0 25px ${catColor.glow}`
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Live Demo
          </m.a>
        )}

        <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
          <m.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
            title="Share link"
          >
            <Share2 className="w-4 h-4" />
          </m.button>
          <div className="w-px h-4 bg-white/10 my-auto" />
          <m.a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            className="p-2 text-gray-400 hover:text-[#1DA1F2] transition-colors"
            title="Share on Twitter"
          >
            <Twitter className="w-4 h-4" />
          </m.a>
          <m.a
            href={linkedinShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            className="p-2 text-gray-400 hover:text-[#0077b5] transition-colors"
            title="Share on LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </m.a>
          <m.a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            className="p-2 text-gray-400 hover:text-[#25D366] transition-colors"
            title="Share on WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </m.a>
        </div>
      </div>
    </div>

    <m.div
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={{ delay: 0.2 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${catColor.text}30`,
        boxShadow: `0 20px 80px rgba(0, 0, 0, 0.5), 0 0 60px ${catColor.glow}`
      }}
    >
      <div className="aspect-video relative">
        {project.imageUrl ? (
          <>
            <OptimizedImage
              src={project.imageUrl}
              alt={project.title}
              width={1200}
              height={675}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(20, 15, 40, 1) 0%, rgba(30, 20, 50, 1) 100%)' }}
          >
            <Layers className="w-20 h-20 text-gray-700" />
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 rounded-tl-2xl" style={{ borderColor: `${catColor.text}40` }} />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 rounded-br-2xl" style={{ borderColor: `${catColor.text}40` }} />
    </m.div>
  </div>
);

export const OtherProjectsSection = ({
  projects,
}: {
  projects: {
    id: number;
    title: string;
    description: string;
    imageUrl?: string | null;
  }[];
  catColor: {
    text: string;
    glow: string;
  };
}) => (
  <m.div
    initial={fadeUpLarge.initial}
    whileInView={fadeUpLarge.animate}
    viewport={{ once: true }}
    className="mt-20 pt-12 border-t border-gray-800/20"
  >
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-purple-400" />
          More Projects
        </h2>
        <p className="text-gray-400 mt-1">Discover other solutions I've built</p>
      </div>
      <Link href="/#projects">
        <button className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 group">
          View full portfolio
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </Link>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {projects.map((p) => (
        <Link key={p.id} href={`/project/${p.id}`}>
          <m.div
            {...hoverLift}
            className="group relative cursor-pointer"
          >
            <div
              className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"
            />
            <div
              className="relative h-full rounded-2xl p-4 overflow-hidden"
              style={{
                background: 'rgba(15, 10, 35, 0.6)',
                border: '1px solid rgba(100, 100, 140, 0.2)'
              }}
            >
              <div className="aspect-video rounded-xl overflow-hidden mb-4">
                <OptimizedImage
                  src={p.imageUrl ?? undefined}
                  alt={`Thumbnail of ${p.title}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                {p.title}
              </h4>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                {p.description}
              </p>
            </div>
          </m.div>
        </Link>
      ))}
    </div>
  </m.div>
);
