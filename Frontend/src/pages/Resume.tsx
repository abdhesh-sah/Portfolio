import { useRef, useState, useEffect } from "react";
import { m } from "framer-motion";
import { Mail, Globe, Github, Linkedin, MapPin, Printer } from "lucide-react";
import { useProjects, useSkills, useExperiences } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { useToast } from "#src/hooks/use-toast";
import { Button } from "#src/components/ui/button";
import { format } from "date-fns";
import { apiFetch } from "#src/lib/api-helpers";
import { Sparkles, FileText } from "lucide-react";
import { cn } from "#src/lib/utils";
import { SkillAnalysisPanel } from "#src/components/SkillAnalysisPanel";
import { AdminButton } from "#src/components/admin/AdminShared";
import { trackEngagementMilestone } from "#src/lib/analytics";

export default function Resume() {
    const { data: settings } = useSiteSettings();
    const { data: experiences = [] } = useExperiences();
    const { data: skills = [] } = useSkills();
    const { data: projects = [] } = useProjects();
    const resumeRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');
    const [jobDescription, setJobDescription] = useState("");
    const [generatedLetter, setGeneratedLetter] = useState("");
    const [matchScore, setMatchScore] = useState<number | null>(null);
    const [missingSkills, setMissingSkills] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const githubDisplay = settings?.socialGithub
        ? settings.socialGithub.replace(/^https?:\/\//, "").replace(/\/$/, "")
        : null;

    const linkedinDisplay = settings?.socialLinkedin
        ? settings.socialLinkedin.replace(/^https?:\/\//, "").replace(/\/$/, "")
        : null;

    const siteDisplay = typeof window !== "undefined" ? window.location.hostname : "myportfolio.dev";

    // ── Engagement Milestone: fire once when recruiter lands on /resume ──
    useEffect(() => {
        trackEngagementMilestone("viewed_resume");
    }, []);

    const handlePrint = () => {
        // Signal high-intent action (Print / Save as PDF) before dialog opens
        trackEngagementMilestone("clicked_contact");
        window.print();
    };

    const handleGenerate = async () => {
        if (!jobDescription.trim() || jobDescription.length < 50) {
            toast({ title: "Input Required", description: "Please paste a detailed job description (min 50 chars).", variant: "destructive" });
            return;
        }

        setIsGenerating(true);
        try {
            const res = await apiFetch("/api/v1/cover-letter/generate", {
                method: "POST",
                body: JSON.stringify({ jobDescription })
            });
            setGeneratedLetter(res.letter);
            if (res.matchScore !== undefined) setMatchScore(res.matchScore);
            if (res.missingSkills) setMissingSkills(res.missingSkills);
            toast({ title: "Generated!", description: "Your custom cover letter and match analysis are ready." });
        } catch (err: unknown) {
            const error = err as Error;
            toast({ title: "Failed", description: error.message || "AI was unable to generate the letter.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    if (!settings) return null;

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
            {/* Toolbar - Hidden when printing */}
            <div className="max-w-4xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 italic font-display">Career_Toolkit</h1>
                    <p className="text-sm text-neutral-500">Recruiter-ready documents powered by AI</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="nm-inset p-1 rounded-xl flex gap-1 mr-4">
                        <button 
                            onClick={() => setActiveTab('resume')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'resume' ? "bg-white dark:bg-neutral-800 text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            Resume
                        </button>
                        <button 
                            onClick={() => setActiveTab('cover-letter')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                activeTab === 'cover-letter' ? "bg-white dark:bg-neutral-800 text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            <Sparkles size={10} /> Smart_Letter
                        </button>
                    </div>
                    {activeTab === 'resume' ? (
                        <Button
                            onClick={handlePrint}
                            className="bg-primary text-primary-foreground font-bold shadow-lg"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print / Save as PDF
                        </Button>
                    ) : (
                        generatedLetter && (
                            <Button
                                onClick={handlePrint}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Print Letter
                            </Button>
                        )
                    )}
                </div>
            </div>

            {activeTab === 'resume' ? (
                /* Resume Content */
            <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                ref={resumeRef}
                className="max-w-[210mm] mx-auto bg-white text-black p-[20mm] shadow-2xl relative overflow-hidden print:shadow-none print:p-0 print:m-0"
            >
                {/* Header */}
                <header className="border-b-2 border-neutral-100 pb-8 mb-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tight uppercase">{settings.personalName}</h1>
                            <h2 className="text-xl font-bold text-primary opacity-80 uppercase tracking-widest">{settings.personalTitle}</h2>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-1.5 text-sm font-medium text-neutral-600">
                            <div className="flex items-center gap-2">
                                <span>{settings.socialEmail}</span>
                                <Mail className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span>{settings.locationText}</span>
                                <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span>{siteDisplay}</span>
                                <Globe className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Left Column - Main Content */}
                    <div className="md:col-span-2 space-y-10">
                        {/* Summary */}
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-4">Professional Profile</h3>
                            <p className="text-neutral-700 leading-relaxed text-sm">
                                {settings.personalBio} {settings.aboutDescription}
                            </p>
                        </section>

                        {/* Experience */}
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-6 border-b border-neutral-100 pb-2">Experience</h3>
                            <div className="space-y-8">
                                {experiences.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((exp) => (
                                    <div key={exp.id} className="relative pl-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-base">{exp.role}</h4>
                                            <span className="text-[10px] font-bold text-neutral-400 tabular-nums uppercase">
                                                {format(new Date(exp.startDate), "MMM yyyy")} — {exp.endDate ? format(new Date(exp.endDate), "MMM yyyy") : "Present"}
                                            </span>
                                        </div>
                                        <div className="text-primary text-xs font-bold mb-3 tracking-wide">{exp.organization}</div>
                                        <p className="text-neutral-600 text-[13px] leading-relaxed whitespace-pre-line">
                                            {exp.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Key Projects */}
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-6 border-b border-neutral-100 pb-2">Featured Work</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {projects.filter(p => !p.isHidden && p.isFlagship).slice(0, 3).map((p) => (
                                    <div key={p.id}>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-sm underline underline-offset-4 decoration-primary/30">{p.title}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-neutral-400">{p.category}</span>
                                            </div>
                                        </div>
                                        <p className="text-neutral-600 text-[13px] line-clamp-2 italic">
                                            {p.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column - Skills & AI Analysis */}
                    <div className="space-y-10">
                        {/* AI Skill Analysis - New v2.0 feature */}
                        <m.section
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="print:hidden"
                        >
                            <SkillAnalysisPanel />
                        </m.section>

                        {/* Skills */}
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-6 border-b border-neutral-100 pb-2">Technical Arsenal</h3>
                            <div className="space-y-6">
                                {Array.from(new Set(skills.map(s => s.category))).map(cat => (
                                    <div key={cat}>
                                        <h4 className="text-[10px] font-black uppercase text-primary mb-2 tracking-wider">{cat}</h4>
                                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                                            {skills.filter(s => s.category === cat).map(s => (
                                                <span key={s.id} className="text-[13px] text-neutral-700 font-medium">
                                                    {s.name}{cat === "Languages" && " "}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Education/Other */}
                        <section>
                           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-4">Focus Areas</h3>
                           <div className="space-y-3">
                                {settings.aboutTechStack?.slice(0, 5).map(tech => (
                                    <div key={tech} className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-primary" />
                                        <span className="text-xs font-medium text-neutral-600">{tech}</span>
                                    </div>
                                ))}
                           </div>
                        </section>

                        {/* Links/QR */}
                        <section className="pt-8">
                             <div className="space-y-4 border-t border-neutral-100 pt-6">
                                {githubDisplay && (
                                    <a href={settings.socialGithub || "#"} className="flex items-center gap-3 text-neutral-500 hover:text-black transition-colors">
                                        <Github className="w-4 h-4" />
                                        <span className="text-xs font-bold">{githubDisplay}</span>
                                    </a>
                                )}
                                {linkedinDisplay && (
                                    <a href={settings.socialLinkedin || "#"} className="flex items-center gap-3 text-neutral-500 hover:text-black transition-colors">
                                        <Linkedin className="w-4 h-4" />
                                        <span className="text-xs font-bold">{linkedinDisplay}</span>
                                    </a>
                                )}
                             </div>
                        </section>
                    </div>
                </div>

                {/* Footer / Permanent Mark */}
                <footer className="mt-16 pt-8 border-t border-neutral-50 text-center">
                    <p className="text-[10px] text-neutral-300 font-mono tracking-widest uppercase">
                        Rendered dynamically via Portfolio v2.0 // {new Date().getFullYear()}
                    </p>
                </footer>
            </m.div>
            ) : (
                /* Cover Letter Generator UI */
                <m.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-4xl mx-auto space-y-8"
                >
                    <div className="nm-flat rounded-3xl p-8 border border-primary/10">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold flex items-center gap-2 text-neutral-800 dark:text-neutral-100">
                                        <FileText className="text-primary" size={20} /> Paste Job Description
                                    </h3>
                                    <p className="text-xs text-neutral-500">AI will analyze requirements and match them with your specific projects and skills.</p>
                                </div>
                                <textarea 
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the job posting here... e.g. We are looking for a Senior React Engineer with experience in PostgreSQL and AWS..."
                                    className="w-full h-64 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none font-sans leading-relaxed"
                                />
                                <AdminButton 
                                    onClick={handleGenerate}
                                    isLoading={isGenerating}
                                    icon={Sparkles}
                                    className="w-full py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] bg-primary text-white shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
                                >
                                    Generate_Tailored_Letter
                                </AdminButton>
                            </div>

                            <div className="w-full md:w-80 space-y-6">
                                <div className="nm-inset rounded-2xl p-6 space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">How_it_works</h4>
                                    <ul className="space-y-4">
                                        {[
                                            "Reads your actual DB projects",
                                            "Matches skills with JD",
                                            "Writes in your professional voice",
                                            "Ready for instant printing"
                                        ].map((step, i) => (
                                            <li key={i} className="flex items-start gap-3 text-[11px] text-neutral-600 dark:text-neutral-400">
                                                <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">{i+1}</div>
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                                    <p className="text-[10px] text-amber-500 font-bold leading-relaxed uppercase tracking-tighter">
                                        Tip: The more detailed the Job Description, the better the matching results.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {matchScore !== null && (
                        <m.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="nm-flat rounded-2xl p-6 border border-primary/20 flex flex-col md:flex-row items-center gap-8 bg-primary/5"
                        >
                            <div className="relative w-24 h-24 flex-shrink-0">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle className="text-neutral-200 dark:text-neutral-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                    <m.circle 
                                        className="text-primary" 
                                        strokeWidth="8" 
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 * (1 - (matchScore || 0) / 100)}
                                        strokeLinecap="round" 
                                        stroke="currentColor" 
                                        fill="transparent" 
                                        r="40" cx="50" cy="50" 
                                        initial={{ strokeDashoffset: 251.2 }}
                                        whileInView={{ strokeDashoffset: 251.2 * (1 - (matchScore || 0) / 100) }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black">{matchScore}%</span>
                                    <span className="text-[7px] uppercase font-bold text-muted-foreground">Match</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-3 text-center md:text-left">
                                <h4 className="font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                                    <Sparkles size={14} className="text-primary" /> 
                                    AI Profile Alignment
                                </h4>
                                <div className="space-y-2">
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-lg">
                                        Your profile is a <span className="font-bold text-primary">{matchScore >= 80 ? 'Strong' : matchScore >= 60 ? 'Good' : 'Fair'}</span> match for this role. 
                                        {missingSkills.length > 0 ? " Focus on these areas to reach the 90%+ threshold:" : " You're exceptionally well-aligned for this role."}
                                    </p>
                                    {missingSkills.length > 0 && (
                                        <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                                            {missingSkills.map(skill => (
                                                <span key={skill} className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded text-[9px] font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-300/30">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </m.div>
                    )}

                    {generatedLetter && (
                        <m.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white text-black p-[20mm] shadow-2xl relative overflow-hidden print:shadow-none print:p-0 print:m-0 mx-auto"
                            style={{ width: '210mm' }}
                        >
                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800">
                                {generatedLetter}
                            </div>
                            <div className="mt-20 pt-8 border-t border-neutral-50 text-center print:hidden">
                                <p className="text-[10px] text-neutral-300 font-mono tracking-widest uppercase">
                                    Tailored by Portfolio AI // {new Date().getFullYear()}
                                </p>
                            </div>
                        </m.div>
                    )}
                </m.div>
            )}

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        margin: 15mm;
                        size: A4;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    /* Ensure text is black and background is white when printing */
                    div, section, header, footer {
                        background: transparent !important;
                        box-shadow: none !important;
                        border-color: #eee !important;
                    }
                    h1, h2, h3, h4 {
                        color: black !important;
                    }
                    p, span, li {
                        color: #333 !important;
                    }
                    /* Force page breaks for long resumes if needed */
                    section {
                        page-break-inside: avoid;
                    }
                }
            `}} />
        </div>
    );
}
