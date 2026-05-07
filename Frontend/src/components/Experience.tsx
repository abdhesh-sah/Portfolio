import { m, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { fadeUp, fadeDown, fadeIn, scaleIn, bobble, hoverScale, staggerContainer, staggerChild } from "#src/lib/animation";
import { useExperiences } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import type { Experience as ExperienceType } from "#shared/schema";
import { Calendar, Briefcase, GraduationCap, ChevronDown, MapPin } from "lucide-react";

import { formatDate as standardFormatDate } from "#src/lib/utils/date";

// Animated Timeline Line
const TimelineLine = ({ isActive }: { isActive: boolean }) => (
  <div className="absolute left-0 top-0 h-full w-1 overflow-hidden">
    <div className="absolute inset-0 bg-border/50" />
    <m.div
      initial={{ height: 0 }}
      animate={{ height: isActive ? "100%" : "0%" }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="absolute top-0 left-0 w-full bg-gradient-to-b from-primary via-primary to-primary/50"
    />
    {/* Glow effect */}
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      className="absolute top-0 left-0 w-full h-full bg-primary/30 blur-sm"
    />
  </div>
);

// Timeline Dot with Pulse
const TimelineDot = ({ isActive, delay }: { isActive: boolean; delay: number }) => (
  <m.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 200 }}
    className="absolute -left-[10px] top-2"
  >
    {/* Outer pulse ring */}
    {isActive && (
      <m.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 w-[21px] h-[21px] rounded-full bg-primary"
      />
    )}
    {/* Main dot */}
    <div className={`relative w-[21px] h-[21px] rounded-full border-4 border-background shadow-lg ${isActive ? 'bg-primary shadow-primary/50' : 'bg-muted'}`}>
      {isActive && (
        <div className="absolute inset-1 rounded-full bg-primary-foreground/30" />
      )}
    </div>
  </m.div>
);

// Expandable Timeline Item
const TimelineItem = ({
  role,
  org,
  period,
  startDate,
  endDate,
  desc,
  delay,
  type,
  isLast
}: {
  role: string;
  org: string;
  period?: string | null;
  startDate?: Date | string;
  endDate?: Date | string | null;
  desc: string;
  delay: number;
  type: "education" | "work";
  isLast?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const formatDate = (date: Date | string) => {
    return standardFormatDate(date, { month: 'short', year: 'numeric' });
  };

  const displayPeriod = period || (startDate ? `${formatDate(startDate)} - ${endDate ? formatDate(endDate) : 'Present'}` : '');

  return (
    <m.div
      ref={ref}
      variants={staggerChild}
      className={`relative pl-10 ${!isLast ? 'pb-10' : ''}`}
    >
      <TimelineLine isActive={isInView} />
      <TimelineDot isActive={isInView} delay={delay} />

      <m.div
        whileHover={{ x: 5 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md p-6 rounded-2xl border border-primary/20 hover:border-primary/50 shadow-sm hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all cursor-pointer group"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {role}
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1">
              <span className="text-primary font-semibold flex items-center gap-1 text-sm md:text-base">
                {type === "education" ? <GraduationCap className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                {org}
              </span>
              <span className="flex items-center text-sm text-muted-foreground gap-1">
                <Calendar className="w-3 h-3" />
                {displayPeriod}
              </span>
            </div>
          </div>
          <m.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </m.div>
        </div>

        {/* Expandable Content */}
        <m.div
          initial={false}
          animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="pt-4 mt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {desc}
            </p>

            {/* Additional info based on type */}
            {type === "education" && (
              <div className="flex flex-wrap gap-2 mt-4">
                {["Electronics", "Communication", "Programming"].map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </m.div>
      </m.div>
    </m.div>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) => (
  <m.div
    initial={fadeUp.initial}
    whileInView={fadeUp.animate}
    viewport={{ once: true }}
    className="flex items-center gap-4 mb-8"
  >
    <m.div
      whileHover={{ rotate: 360, scale: 1.1 }}
      transition={{ duration: 0.5 }}
      className="p-4 bg-primary/10 rounded-2xl text-primary"
    >
      <Icon className="w-7 h-7" />
    </m.div>
    <div>
      <h3 className="text-2xl font-bold text-foreground">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  </m.div>
);

const CurrentStatusBadge = () => (
  <m.div
    initial={scaleIn.initial}
    whileInView={scaleIn.animate}
    viewport={{ once: true }}
    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-sm font-medium border border-green-500/20"
  >
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
    Currently Learning
  </m.div>
);

export default function Experience() {
  const { data: experiences, isLoading } = useExperiences();
  const { data: settings } = useSiteSettings();

  // Split into education and work
  const education = (experiences as ExperienceType[])?.filter(e => e.type === "Education") || [];
  const work = (experiences as ExperienceType[])?.filter(e => e.type === "Experience") || [];

  return (
    <section id="experience" className="section-container overflow-hidden relative">
      <div className="absolute inset-0 bg-background/20 pointer-events-none -z-10" />
      {/* Section Header */}
      <div className="text-center mb-16">
        <m.h2
          initial={fadeDown.initial}
          whileInView={fadeDown.animate}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-4 text-foreground"
        >
          {settings?.experienceHeading || "Professional Journey"}
        </m.h2>
        <m.div
          initial={{ width: 0 }}
          whileInView={{ width: "5rem" }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="h-1.5 bg-primary mx-auto rounded-full mb-6"
        />
        <m.p
          initial={fadeIn.initial}
          whileInView={fadeIn.animate}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground max-w-xl mx-auto"
        >
          A timeline of my educational background and professional experiences
        </m.p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto">
        {/* Education Column */}
        <div>
          <SectionHeader
            icon={GraduationCap}
            title="Education"
            subtitle="Academic Background"
          />

          <m.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-0 relative"
          >
            {isLoading || education.length === 0 ? (
              <>
                <TimelineItem
                  key="edu-fallback-1"
                  role="B.E. in Electronics & Communication"
                  org="Tribhuvan University"
                  period="2023 - Present"
                  desc="Pursuing Bachelor's degree focusing on Embedded Systems, Signal Processing, Digital Electronics, and Software Engineering principles. Building strong foundation in both hardware and software development."
                  delay={0.1}
                  type="education"
                />
                <TimelineItem
                  key="edu-fallback-2"
                  role="+2 Science (PCM)"
                  org="Higher Secondary"
                  period="2021 - 2023"
                  desc="Completed higher secondary education with focus on Physics, Chemistry, and Mathematics. Developed strong analytical and problem-solving skills."
                  delay={0.2}
                  type="education"
                  isLast
                />
              </>
            ) : (
              education.map((edu, idx) => (
                <TimelineItem
                  key={edu.id}
                  role={edu.role}
                  org={edu.organization}
                  period={edu.period}
                  startDate={edu.startDate}
                  endDate={edu.endDate}
                  desc={edu.description}
                  delay={idx * 0.15}
                  type="education"
                  isLast={idx === education.length - 1}
                />
              ))
            )}
          </m.div>

          {/* Current Status */}
          <m.div
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 pl-10"
          >
            <CurrentStatusBadge />
          </m.div>
        </div>

        {/* Experience Column */}
        <div>
          <SectionHeader
            icon={Briefcase}
            title="Experience"
            subtitle="Professional Journey"
          />

          <m.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-0 relative"
          >
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 bg-foreground/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : work.length === 0 ? (
              <m.div
                initial={fadeUp.initial}
                whileInView={fadeUp.animate}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Open to Opportunities Card */}
                <m.div
                  whileHover={{ scale: 1.02 }}
                  className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border-2 border-dashed border-primary/30 text-center"
                >
                  <m.div
                    animate={bobble.animate}
                    transition={bobble.transition}
                    className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center"
                  >
                    <Briefcase className="w-8 h-8 text-primary" />
                  </m.div>
                  <h4 className="text-xl font-bold mb-2">Open to Opportunities</h4>
                  <p className="text-muted-foreground mb-4">
                    I'm actively seeking internships and entry-level opportunities to apply my skills and grow professionally.
                  </p>
                  <m.button
                    {...hoverScale}
                    onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
                  >
                    Get In Touch
                  </m.button>
                </m.div>

                {/* What I'm Looking For */}
                <m.div
                  initial={fadeUp.initial}
                  whileInView={fadeUp.animate}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md rounded-2xl border border-primary/20"
                >
                  <h5 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    What I'm Looking For
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "Software Development",
                      "Full Stack Roles",
                      "System Design",
                      "Remote/Hybrid"
                    ].map((item, i) => (
                      <m.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {item}
                      </m.div>
                    ))}
                  </div>
                </m.div>
              </m.div>
            ) : (
              work.map((exp, idx) => (
                <TimelineItem
                  key={exp.id}
                  role={exp.role}
                  org={exp.organization}
                  period={exp.period}
                  startDate={exp.startDate}
                  endDate={exp.endDate}
                  desc={exp.description}
                  delay={idx * 0.15}
                  type="work"
                  isLast={idx === work.length - 1}
                />
              ))
            )}
          </m.div>
        </div>
      </div>
    </section>
  );
}
