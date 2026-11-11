/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useSiteSettings, useUpdateSiteSettings } from "#src/hooks/use-site-settings";
import { useToast } from "#src/hooks/use-toast";
import { LoadingSkeleton } from "#src/components/admin/AdminShared";
import { DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type { InsertSiteSettings } from "#shared";
import { insertSiteSettingsApiSchema } from "#shared";

type FormPrimitiveArray<T> = {
  fields: Record<"id", string>[];
  append: (value: T) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
};

// Sub-components
import { CustomizationHeader } from "../customization/CustomizationHeader";
import { PersonalBrandingSection } from "../customization/PersonalBrandingSection";
import { SocialPresenceSection } from "../customization/SocialPresenceSection";
import { HeroSection } from "../customization/HeroSection";
import { NavbarSection } from "../customization/NavbarSection";
import { FooterSection } from "../customization/FooterSection";
import { SectionLayoutSection } from "../customization/SectionLayoutSection";
import { ActiveFeaturesSection } from "../customization/ActiveFeaturesSection";
import { AvailabilitySlotsSection } from "../customization/AvailabilitySlotsSection";
import { WhyHireMeSection } from "../customization/WhyHireMeSection";
import { AboutSection } from "../customization/AboutSection";
import { SectionHeadingsSection } from "../customization/SectionHeadingsSection";
import { StickyFormFooter } from "../customization/StickyFormFooter";

const DEFAULT_SETTINGS: Partial<InsertSiteSettings> = {
  isOpenToWork: true,
  personalName: "Your Name",
  personalTitle: "Full Stack Developer",
  personalBio: "Passionate about building amazing products",
  heroGreeting: "Hey, I am",
  heroBadgeText: "Available for work",
  heroTaglines: ["Building amazing products", "Solving complex problems"],
  heroCtaPrimary: "View My Work",
  heroCtaPrimaryUrl: "#projects",
  heroCtaSecondary: "Get In Touch",
  heroCtaSecondaryUrl: "#contact",
  logoText: "Portfolio.Dev",
  heroHeadingLine1: "Start building",
  heroHeadingLine2: "The Future",
  footerCopyright: `© ${new Date().getFullYear()} Your Name. All rights reserved.`,
  footerTagline: "Building the future, one line of code at a time.",
  socialEmail: "admin@example.com",
  featureBlog: true,
  featureGuestbook: true,
  featureTestimonials: true,
  featureServices: true,
  featurePlayground: false,
  navbarLinks: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Skills", href: "#skills", icon: "zap" },
    { label: "Projects", href: "#projects", icon: "folder" },
    { label: "Experience", href: "#experience", icon: "briefcase" },
    { label: "Blog", href: "/blog", icon: "book" },
    { label: "Contact", href: "#contact", icon: "mail" },
  ],
  sectionOrder: ["about", "skills", "whyhireme", "services", "mindset", "projects", "practice", "experience", "testimonials", "guestbook", "contact"],
  sectionVisibility: { hero: true, about: true, projects: true, skills: true, testimonials: true, contact: true },
  availabilitySlots: [],
  aboutAvailability: "Open to Work",
  aboutDescription: "Building scalable web systems and analyzing complex algorithms.",
  aboutTechStack: ["React", "Node.js", "TypeScript", "PostgreSQL", "Tailwind"],
  aboutTimeline: [
    { year: "2024 - Present", title: "Advanced System Design", description: "Deep diving into distributed systems, Docker, and Microservices architecture." },
    { year: "2023", title: "Engineering Core", description: "Mastering Data Structures, Algorithms, and OOP at Tribhuvan University." },
    { year: "2022", title: "Hello World", description: "Started the journey with Python scripting and basic web development." }
  ],
  chatbotGreeting: "Hello! I'm your portfolio AI assistant. How can I help you today?",
  personalPhone: "+977 9800000000",
  aboutHeading: "About Me",
  projectsHeading: "Featured Projects",
  skillsHeading: "Technical Arsenal",
  whyHireMeHeading: "Why Hire Me",
  servicesHeading: "What I Do",
  mindsetHeading: "Engineering Mindset",
  practiceHeading: "Disciplined Practice",
  experienceHeading: "Professional Journey",
  testimonialsHeading: "Client Feedback",
  guestbookHeading: "Guestbook",
  contactHeading: "Get In Touch",
  blogHeading: "Latest Articles"
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero / Intro",
  about: "About Me",
  skills: "Skills / Expertise",
  whyhireme: "Why Hire Me",
  services: "Services Offered",
  mindset: "Developer Mindset",
  projects: "Featured Projects",
  practice: "Lab / Practice",
  experience: "Work Experience",
  testimonials: "Testimonials",
  guestbook: "Public Guestbook",
  contact: "Contact Form",
  blog: "Latest Articles"
};

export function CustomizationTab() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { register, control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm<InsertSiteSettings>({
    defaultValues: settings || DEFAULT_SETTINGS,
    values: settings,
  });

  const { fields: taglineFields, append: appendTagline, remove: removeTagline } = useFieldArray({
    control,
    name: "heroTaglines" as never,
  }) as unknown as FormPrimitiveArray<string>;

  const { fields: navFields, append: appendNav, remove: removeNav, move: moveNav } = useFieldArray<InsertSiteSettings, "navbarLinks">({
    control,
    name: "navbarLinks",
  });

  const { fields: sectionOrderFields, move: moveSection } = useFieldArray({
    control,
    name: "sectionOrder" as never,
  }) as unknown as FormPrimitiveArray<string>;

  const handleNavDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = navFields.findIndex((f) => f.id === active.id);
      const newIndex = navFields.findIndex((f) => f.id === over.id);
      moveNav(oldIndex, newIndex);
    }
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrderFields.findIndex((f) => f.id === active.id);
      const newIndex = sectionOrderFields.findIndex((f) => f.id === over.id);
      moveSection(oldIndex, newIndex);
    }
  };

  const [activeSection, setActiveSection] = useState<string | null>("personal");

  const toggleSection = (id: string) => {
    setActiveSection(prev => prev === id ? null : id);
  };

  const onSubmit = async (data: InsertSiteSettings) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({ title: "Success", description: "Settings updated successfully" });
      reset(data);
    } catch (err: any) {
      let description = err instanceof Error ? err.message : "An error occurred";
      if (err.data && Array.isArray(err.data.errors)) {
        description += " - " + err.data.errors.map((e: any) => `${e.path}: ${e.message}`).join(", ");
      }
      toast({
        title: "Update Failed",
        description,
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    if (!settings) return;
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfolio-settings-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: "Settings saved to JSON file" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const imported = JSON.parse(result);
        const parseResult = insertSiteSettingsApiSchema.safeParse(imported);

        if (!parseResult.success) {
          const errorMsg = parseResult.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(", ");
          throw new Error(`Invalid format: ${errorMsg}`);
        }

        reset(parseResult.data);
        toast({ title: "Import Successful", description: "Settings loaded into form. Don't forget to save!" });
      } catch (err) {
        toast({
          title: "Import Failed",
          description: err instanceof Error ? err.message : "Invalid JSON file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    if (confirm("Are you sure? This will revert all fields to factory defaults but won't save until you click 'Save Changes'.")) {
      reset(DEFAULT_SETTINGS as InsertSiteSettings);
      toast({ title: "Reset Applied", description: "Defaults loaded into form." });
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-24">
      <CustomizationHeader
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        onReset={handleReset}
      />

      <input
        type="file"
        id="import-settings"
        ref={fileInputRef}
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PersonalBrandingSection
          register={register}
          isOpen={activeSection === "personal"}
          onToggle={() => toggleSection("personal")}
        />

        <SocialPresenceSection
          register={register}
          isOpen={activeSection === "social"}
          onToggle={() => toggleSection("social")}
        />

        <HeroSection
          register={register}
          taglineFields={taglineFields}
          appendTagline={appendTagline}
          removeTagline={removeTagline}
          isOpen={activeSection === "hero"}
          onToggle={() => toggleSection("hero")}
        />

        <SectionHeadingsSection
          register={register}
          isOpen={activeSection === "headings"}
          onToggle={() => toggleSection("headings")}
        />

        <NavbarSection
          register={register}
          navFields={navFields}
          appendNav={appendNav}
          removeNav={removeNav}
          moveNav={moveNav}
          sensors={sensors}
          handleNavDragEnd={handleNavDragEnd}
          isOpen={activeSection === "navbar"}
          onToggle={() => toggleSection("navbar")}
        />


        <FooterSection
          register={register}
          isOpen={activeSection === "footer"}
          onToggle={() => toggleSection("footer")}
        />

        <AboutSection
          register={register}
          control={control}
          isOpen={activeSection === "about"}
          onToggle={() => toggleSection("about")}
        />

        <WhyHireMeSection
          register={register}
          control={control}
          isOpen={activeSection === "whyhireme"}
          onToggle={() => toggleSection("whyhireme")}
        />

        <SectionLayoutSection
          control={control}
          sectionOrder={watch("sectionOrder") || []}
          sectionOrderFields={sectionOrderFields}
          moveSection={moveSection}
          sensors={sensors}
          handleSectionDragEnd={handleSectionDragEnd}
          sectionLabels={SECTION_LABELS}
          settings={settings}
          isOpen={activeSection === "sections"}
          onToggle={() => toggleSection("sections")}
        />

        <ActiveFeaturesSection
          control={control}
          isOpen={activeSection === "features"}
          onToggle={() => toggleSection("features")}
        />

        <AvailabilitySlotsSection
          slots={watch("availabilitySlots") || []}
          onChange={(slots) => setValue("availabilitySlots", slots, { shouldDirty: true })}
          isOpen={activeSection === "availability"}
          onToggle={() => toggleSection("availability")}
        />

        <StickyFormFooter
          isDirty={isDirty}
          isPending={updateMutation.isPending}
        />
      </form>
    </div>
  );
}

export default CustomizationTab;
