import { m, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { fadeLeft, fadeUpLarge, fadeDown, scaleXReveal, scaleIn, bobble, hoverScale } from "#src/lib/animation";
import { CheckCircle2, Award, Zap, ShieldCheck, Download, ArrowRight, Sparkles, Target, TrendingUp, Terminal } from "lucide-react";
import { Button } from "#src/components/ui/button";
import { useProjects, useSkills, useArticles, useExperiences } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { trackEvent } from "#src/lib/analytics";

// Animated Counter
const AnimatedCounter = ({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <m.div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-primary mb-1">
        {count}{suffix}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </m.div>
  );
};

// Skill Progress Bar
const SkillBar = ({ skill, level, delay, color }: { skill: string; level: number; delay: number; color: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <m.div
      ref={ref}
      initial={fadeLeft.initial}
      animate={isInView ? fadeLeft.animate : {}}
      transition={{ delay }}
      className="mb-4"
    >
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{skill}</span>
        <span className="text-xs text-muted-foreground">{level}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <m.div
          initial={{ width: 0 }}
          animate={isInView ? { width: `${level}%` } : {}}
          transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </m.div>
  );
};



const defaultSkills = [
  { skill: "Problem Solving", level: 85, color: "bg-gradient-to-r from-violet-500 to-purple-500" },
  { skill: "Learning Speed", level: 90, color: "bg-gradient-to-r from-blue-500 to-cyan-500" },
  { skill: "Communication", level: 80, color: "bg-gradient-to-r from-green-500 to-emerald-500" },
  { skill: "Team Collaboration", level: 85, color: "bg-gradient-to-r from-orange-500 to-yellow-500" },
];

export default function WhyHireMe() {
  const { data: projects } = useProjects();
  const { data: allSkills } = useSkills();
  const { data: articles } = useArticles("published");
  const { data: experiences } = useExperiences();
  
  const { data: settings } = useSiteSettings();
  
  const resumeUrl = settings?.resumeUrl || "/resume.pdf";
  const resumeFileName = resumeUrl.split('/').pop() || "Resume.pdf";



  const dynamicSkills = settings?.whyHireMeData?.skills?.map((s: string | { skill: string; level: number; color?: string }, i: number) => ({
    skill: typeof s === 'string' ? s : s.skill,
    level: typeof s === 'string' ? 85 : s.level || 85,
    color: typeof s === 'string' ? defaultSkills[i % defaultSkills.length].color : s.color || defaultSkills[i % defaultSkills.length].color
  })) || defaultSkills;
  
  const displayDescription = settings?.whyHireMeData?.description || "As a student, I bring fresh perspectives, high energy, and a commitment to professional growth. Let's discuss how I can help your organization succeed.";

  return (
    <section id="why-hire-me" className="section-container overflow-hidden relative">
      <div className="absolute inset-0 bg-background/20 pointer-events-none -z-10" />
      {/* Header */}
      <div className="text-center mb-16">
        <m.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4"
        >
          <Sparkles className="w-4 h-4" />
          Why Choose Me
        </m.div>
        <m.h2
          initial={fadeDown.initial}
          whileInView={fadeDown.animate}
          viewport={{ once: true }}
          className="text-foreground text-3xl md:text-5xl font-bold mb-4"
        >
          {settings?.whyHireMeHeading || "Why Hire Me as a Student Engineer"}
        </m.h2>
        <m.div
          initial={scaleXReveal.initial}
          whileInView={scaleXReveal.animate}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="h-1.5 w-20 bg-primary mx-auto rounded-full origin-center"
        />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Stats Row */}
        <m.div
          initial={fadeUpLarge.initial}
          whileInView={fadeUpLarge.animate}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md rounded-3xl border border-primary/20 mb-12"
        >
          <AnimatedCounter value={allSkills?.length ?? 0} suffix="+" label="Tech Stack" />
          <AnimatedCounter value={projects?.length ?? 0} suffix="+" label="Systems Built" />
          <AnimatedCounter value={articles?.length ?? 0} suffix="+" label="Technical Articles" />
          <AnimatedCounter value={experiences?.length ?? 0} suffix="+" label="Experiences" />
        </m.div>



        {/* Skills Section */}
        <m.div
          initial={fadeUpLarge.initial}
          whileInView={fadeUpLarge.animate}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-12 mb-12"
        >
          {/* Core Competencies */}
          <div className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md rounded-3xl border border-primary/20 h-full">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-foreground">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              Core Competencies
            </h3>
            <div className="space-y-6">
              {dynamicSkills.slice(0, 4).map((s: { skill: string; level: number; color: string }, i: number) => (
                <SkillBar key={i} {...s} delay={i * 0.1} />
              ))}
            </div>
            
            <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 italic text-sm text-muted-foreground">
              "Technical excellence is not an act, but a habit of disciplined engineering."
            </div>
          </div>

          {/* What Sets Me Apart */}
          <div className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md rounded-3xl border border-primary/20 h-full">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-foreground">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              Professional Mindset
            </h3>
            <div className="grid gap-4">
              {dynamicSkills.slice(4, 8).map((s: { skill: string; level: number; color: string }, i: number) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-foreground/5 border border-border/50 group hover:bg-primary/5 hover:border-primary/30 transition-all cursor-default"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">{s.skill}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-foreground/10 uppercase tracking-wider">Active</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                       <m.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        transition={{ duration: 1.5, delay: i * 0.1 }}
                        className="h-full bg-primary/30 rounded-full" 
                       />
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
            
            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground px-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Verified through real-world implementation</span>
            </div>
          </div>
        </m.div>

        {/* Tech Stack Section */}
        <m.div
          initial={fadeUpLarge.initial}
          whileInView={fadeUpLarge.animate}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md rounded-3xl border border-primary/20">
            <h3 className="text-xl font-bold mb-8 flex items-center justify-center gap-2 text-center text-foreground">
              <Terminal className="w-5 h-5 text-primary" />
              Development Stack
            </h3>

            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {["TypeScript", "React", "Node.js", "Express", "PostgreSQL", "Drizzle ORM", "Tailwind CSS", "Framer Motion", "Vite", "Docker", "REST APIs", "Git"].map((tech, i) => (
                <m.div
                  key={tech}
                  initial={scaleIn.initial}
                  whileInView={scaleIn.animate}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="px-4 py-2 bg-primary/5 hover:bg-primary/20 border border-primary/20 hover:border-primary/50 text-muted-foreground hover:text-foreground rounded-xl transition-all font-mono text-sm cursor-default shadow-sm"
                >
                  {tech}
                </m.div>
              ))}
            </div>
          </div>
        </m.div>

        {/* CTA Section */}
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center p-12 bg-gradient-to-br from-primary/10 via-card to-primary/5 rounded-3xl border border-primary/20 relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <m.div
              animate={bobble.animate}
              transition={bobble.transition}
              className="w-16 h-16 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </m.div>

            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">Ready to contribute to your team</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              {displayDescription}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <m.div
                {...hoverScale}
              >
                <Button
                  size="lg"
                  className="h-14 px-8 gap-3 rounded-full font-bold shadow-lg shadow-primary/25 text-base"
                  onClick={async () => {
                    await trackEvent({ type: "resume_download", fileName: resumeFileName });
                    const link = document.createElement("a");
                    link.href = resumeUrl;
                    link.download = resumeFileName;
                    link.click();
                  }}
                >
                  <Download className="w-5 h-5" />
                  Download My Resume
                </Button>
              </m.div>

              <m.button
                {...hoverScale}
                onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: 'smooth' })}
                className="h-14 px-8 bg-card/80 backdrop-blur-sm border-2 border-primary/50 text-foreground rounded-full font-bold hover:bg-foreground/5 hover:border-cyan-500/50 transition-all flex items-center gap-2"
              >
                Let's Talk
                <ArrowRight className="w-5 h-5" />
              </m.button>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
