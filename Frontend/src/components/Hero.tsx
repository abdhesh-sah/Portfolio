import { useLocation } from "wouter";
import { m, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { fadeUp, fadeIn, DURATION, EASE } from "#src/lib/animation";
import { ArrowRight, Github, Linkedin, Mail, ChevronDown, Sparkles, Twitter, Instagram, Youtube, Code2, ExternalLink, Globe } from "lucide-react";
import { Button } from "#src/components/ui/button";
import { useProjects, useSkills, useExperiences } from "#src/hooks/use-portfolio";
import { useServerStatus } from "#src/hooks/use-server-status";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { useLatestCommit } from "#src/hooks/use-latest-commit";
import { formatTimeAgo } from "#src/lib/utils/date";

import { LiveCodeEditor } from "./LiveCodeEditor";
import type { SiteSettings } from "#shared";

// Mouse Follower Gradient
const MouseGradient = () => {
  const prefersReducedMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 200 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <m.div
      className="fixed inset-0 pointer-events-none z-0"
      style={{ x, y }}
    >
      <div
        className="absolute w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_var(--primary-rgb-20)_0%,_transparent_60%)]"
      />
    </m.div>
  );
};

const RotatingText = ({ strings }: { strings: string[] }) => {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const stringsJson = JSON.stringify(strings);

  useEffect(() => {
    setDisplayed("");
    setIsDeleting(false);
    setIndex(0);
  }, [stringsJson]);

  useEffect(() => {
    const current = strings[index];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayed === current) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayed === "") {
      setIsDeleting(false);
      setIndex((i) => (i + 1) % strings.length);
    } else {
      const speed = isDeleting ? 20 : 40;
      timeout = setTimeout(() => {
        setDisplayed(
          isDeleting
            ? current.slice(0, displayed.length - 1)
            : current.slice(0, displayed.length + 1)
        );
      }, speed);
    }
    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, index, stringsJson, strings.length]);

  return (
    <span className="inline-flex items-center">
      {displayed}
      <span className="ml-0.5 w-[0.6em] h-[1.1em] bg-gray-400 inline-block animate-blink" />
    </span>
  );
};


const OpenToWorkBanner = ({ settings }: { settings: SiteSettings | undefined | null }) => {
  return (
    <m.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      className="relative group mb-8 inline-block"
    >
      {/* Dynamic Background Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt" />

      {/* Banner Body */}
      <div className="relative flex items-center gap-3 px-6 py-2 bg-background/60 backdrop-blur-xl border border-border/50 rounded-full leading-none transition duration-200 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] group-hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.3)]">
        <span className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary shadow-[0_0_8px_var(--primary)]"></span>
          </span>
          <span className="text-primary/90 font-mono text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase whitespace-nowrap">
            Status: {settings?.availabilityStatus || "Open for opportunities"}
          </span>
        </span>

        <div className="h-4 w-[1px] bg-foreground/20 mx-1" />

        <span className="flex items-center gap-1.5 text-secondary font-display text-xs font-semibold group-hover:text-secondary/80 transition-colors">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hiring? Let's Talk</span>
          <span className="sm:hidden text-[10px]">Hiring?</span>
        </span>

        {/* Diagonal Scanline Overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-full">
          <div className="absolute inset-x-0 h-full w-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-30deg] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
        </div>
      </div>
    </m.div>
  );
};

import { LiveVisitorCount } from "./LiveVisitorCount";


const CharacterReveal = ({ text, delay = 0, className = "" }: { text: string; delay?: number, className?: string }) => {
  const words = text.split(" ");
  let charIndex = 0;

  return (
    <span className={`inline-flex flex-wrap gap-x-[0.2em] ${className}`}>
      {words.map((word, wordIdx) => {
        const characters = word.split("");
        const wordStartIdx = charIndex;
        charIndex += characters.length + 1; // +1 for the space

        return (
          <span key={wordIdx} className="inline-flex whitespace-nowrap">
            {characters.map((char, i) => (
              <span key={i} className="overflow-hidden inline-flex">
                <m.span
                  variants={{
                    hidden: { y: "110%", opacity: 0 },
                    visible: { y: 0, opacity: 1 }
                  }}
                  initial="hidden"
                  animate="visible"
                  transition={{
                    delay: delay + (wordStartIdx + i) * 0.03,
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="inline-block"
                >
                  {char}
                </m.span>
              </span>
            ))}
            {/* Add a space if not the last word */}
            {wordIdx < words.length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        );
      })}
    </span>
  );
};

const Magnetic = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    mouseX.set(middleX * 0.35);
    mouseY.set(middleY * 0.35);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <m.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="inline-block w-full sm:w-auto"
      style={{ x, y }}
    >
      {children}
    </m.div>
  );
};

export default function Hero() {
  const [, setLocation] = useLocation();
  const status = useServerStatus();
  const { data: projects } = useProjects();
  const { data: skills } = useSkills();
  const { data: experiences } = useExperiences();
  const { data: settings } = useSiteSettings();

  const showBanner = settings?.isOpenToWork ?? true;

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      <MouseGradient />

      <div className="section-container relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          <m.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE.easeOut }}
            className="space-y-8 text-center lg:text-left"
          >

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              {showBanner && <OpenToWorkBanner settings={settings} />}
              <GitHubStatusBadge />
              <LiveVisitorCount />
            </div>

            {/* Status Pill */}
            <m.div
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ delay: 0.2 }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono backdrop-blur-sm mx-auto lg:mx-0 transition-colors duration-500 ${status === "online"
                ? "bg-primary/10 border-primary/20 text-primary"
                : status === "waking"
                  ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
                }`}
            >
              <div className={`w-2 h-2 rounded-full animate-pulse shadow-glow ${status === "online" ? "bg-primary" : status === "waking" ? "bg-yellow-500" : "bg-red-500"
                }`} />
              {status === "online" ? "SYSTEM_ACTIVE" : status === "checking" ? "SEARCHING_FOR_UPLINK" : status === "waking" ? "WAKING_UP" : "SYSTEM_DEGRADED"}
            </m.div>

            <div className="space-y-4">
              <m.h1
                className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight font-display tracking-tight"
              >
                <span className="sr-only">{settings?.personalName || "Portfolio"} - </span>
                <span className="text-foreground block">
                  <CharacterReveal text={settings?.heroHeadingLine1 || "Start building"} delay={0.4} />
                </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent animate-gradient-x relative inline-flex pb-2">
                   <CharacterReveal text={settings?.heroHeadingLine2 || "The Future"} delay={0.8} />
                  <m.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.5, type: "spring" }}
                  >
                    <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-4 -right-8 animate-pulse" />
                  </m.div>
                </span>
              </m.h1>

              <m.div
                initial={fadeIn.initial}
                animate={fadeIn.animate}
                transition={{ delay: 0.5 }}
                className="text-xl md:text-2xl text-muted-foreground font-light h-[60px] flex items-center justify-center lg:justify-start"
              >
                <span className="text-primary mr-2">{">"}</span>
                <RotatingText
                  strings={settings?.heroTaglines?.length ? settings.heroTaglines : [
                    "Engineering scalable systems.",
                    "Crafting intuitive interfaces.",
                    "Bridging hardware & software.",
                    "Solving complex problems."
                  ]}
                />
              </m.div>
            </div>

            {/* LCP element — no animation delay so it paints immediately */}
            <m.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed"
            >
              I'm <strong className="text-white font-bold">{settings?.personalName || "Portfolio Owner"}</strong>, {settings?.personalBio || "a Full-Stack Engineer passionate about performance, precision, and building digital experiences that feel alive."}
            </m.p>

            <m.div
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ delay: 1.4 }}
              className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start items-center lg:items-start"
            >
              <Magnetic>
                <Button
                  onClick={() => {
                    const url = settings?.heroCtaPrimaryUrl || "#projects";
                    if (url.startsWith("#")) {
                      const target = document.getElementById(url.slice(1));
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  size="lg"
                  aria-label={settings?.heroCtaPrimary || "View My Work"}
                  className="w-full sm:w-auto bg-primary text-black hover:bg-primary/90 font-bold rounded-full px-8 shadow-[0_0_20px_var(--primary-glow)] hover:shadow-[0_0_30px_var(--primary-glow)] transition-all"
                >
                  {settings?.heroCtaPrimary || "View My Work"} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Magnetic>

              <Magnetic>
                <Button
                  onClick={() => {
                    const url = settings?.heroCtaSecondaryUrl || "#contact";
                    if (url.startsWith("#")) {
                      const target = document.getElementById(url.slice(1));
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  size="lg"
                  aria-label={settings?.heroCtaSecondary || "Contact for AI Project Scope"}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full px-8 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all border border-purple-400/30 group"
                >
                  <Sparkles className="mr-2 w-4 h-4 animate-pulse group-hover:scale-125 transition-transform" />
                  {settings?.heroCtaSecondary || "AI Project Scope"}
                </Button>
              </Magnetic>

              <Magnetic>
                <Button
                  onClick={() => setLocation("/resume")}
                  variant="outline"
                  size="lg"
                  aria-label="View Resume"
                  className="w-full sm:w-auto border-border text-foreground hover:bg-foreground/10 rounded-full px-8 backdrop-blur-sm"
                >
                  View Resume <ExternalLink className="ml-2 w-4 h-4" />
                </Button>
              </Magnetic>

              <Magnetic>
                <Button
                  onClick={() => {
                    const target = document.getElementById("contact");
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  variant="ghost"
                  size="lg"
                  aria-label="Contact Me directly via form"
                  className="w-full sm:w-auto text-muted-foreground hover:text-foreground rounded-full px-8"
                >
                  Contact Me <Mail className="ml-2 w-4 h-4" />
                </Button>
              </Magnetic>
            </m.div>

            {/* Social Proof */}
            <m.div
              initial={fadeIn.initial}
              animate={fadeIn.animate}
              transition={{ delay: 1 }}
              className="flex items-center gap-5 justify-center lg:justify-start pt-4 flex-wrap"
            >
              <div className="flex items-center gap-4">
                {settings?.socialGithub && <SocialLink href={settings.socialGithub} icon={Github} label="GitHub" />}
                {settings?.socialLinkedin && <SocialLink href={settings.socialLinkedin} icon={Linkedin} label="LinkedIn" />}
                {settings?.socialTwitter && <SocialLink href={settings.socialTwitter} icon={Twitter} label="Twitter" />}
                {settings?.socialInstagram && <SocialLink href={settings.socialInstagram} icon={Instagram} label="Instagram" />}
                {settings?.socialYoutube && <SocialLink href={settings.socialYoutube} icon={Youtube} label="YouTube" />}
                {settings?.socialDevto && <SocialLink href={settings.socialDevto} icon={Code2} label="Dev.to" />}
                {settings?.socialMedium && <SocialLink href={settings.socialMedium} icon={Globe} label="Medium" />}
              </div>
              <div className="h-4 w-[1px] bg-foreground/10 hidden sm:block" />
              <div className="flex items-center gap-4 py-2">
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground">{(projects?.length ?? 0)}+</span>
                  <p className="text-[10px] text-muted-foreground">Projects</p>
                </div>
                <div className="h-4 w-[1px] bg-foreground/10" />
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground">{(skills?.length ?? 0)}+</span>
                  <p className="text-[10px] text-muted-foreground">Technologies</p>
                </div>
                <div className="h-4 w-[1px] bg-foreground/10" />
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground">{(experiences?.length ?? 0)}+</span>
                  <p className="text-[10px] text-muted-foreground">Experiences</p>
                </div>
              </div>
            </m.div>

          </m.div>

          {/* Hero Visual */}
          <m.div
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
            className="hidden lg:block h-[500px]"
          >
            <LiveCodeEditor />
          </m.div>
        </div>

        {/* Scroll Indicator */}
        <m.div
          animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 cursor-pointer hidden md:block group"
          onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: 'smooth' })}
        >
          <ChevronDown className="w-8 h-8 text-primary/50 group-hover:text-primary transition-colors" />
        </m.div>
      </div>
    </section>
  );
}

const GitHubStatusBadge = () => {
  const { data: commitData, isLoading } = useLatestCommit();

  if (isLoading || !commitData || commitData.repo === "N/A") return null;

  return (
    <m.a
      href={commitData.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.1 }}
      className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-2 group/gh-status transition-colors hover:bg-blue-500/20"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
      </span>
      <span>
        Last Commit: {formatTimeAgo(commitData.date)} in {commitData.repo}
      </span>
      <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover/gh-status:opacity-100 transition-opacity" />
    </m.a>
  );
};

function SocialLink({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
    </a>
  );
}
