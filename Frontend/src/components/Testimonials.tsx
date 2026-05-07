import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useTestimonials } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { Quote, Linkedin, ChevronLeft, ChevronRight } from "lucide-react";
import { OptimizedImage } from "./OptimizedImage";
import { fadeUp } from "#src/lib/animation";

export default function Testimonials() {
    const { data: testimonials, isLoading } = useTestimonials();
    const { data: settings } = useSiteSettings();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    useEffect(() => {
        if (!isAutoPlaying || !testimonials?.length) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, testimonials?.length]);

    if (isLoading) {
        return (
            <section id="testimonials" className="py-24 relative overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="h-8 w-48 rounded-lg bg-foreground/5 animate-pulse" />
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-64 rounded-2xl bg-foreground/5 animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (!testimonials || testimonials.length === 0) return null;

    const current = testimonials[currentIndex];

    return (
        <section
            id="testimonials"
            className="py-24 relative overflow-hidden"
            style={{ background: "linear-gradient(180deg, transparent 0%, hsl(var(--background) / 0.5) 100%)" }}
        >
            {/* Decorative background glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none opacity-50"
                style={{
                    background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.1) 0%, transparent 70%)",
                }}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Section Header */}
                <m.div
                    initial={fadeUp.initial}
                    whileInView={fadeUp.animate}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                        <span
                            className="text-xs font-bold tracking-[0.3em] uppercase text-primary"
                        >
                            Testimonials
                        </span>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
                    </div>
                    <h2
                        className="text-4xl sm:text-5xl font-bold text-foreground mb-6"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        {settings?.testimonialsHeading || "What People Say"}
                    </h2>
                    <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-lg leading-relaxed">
                        Kind words from colleagues, mentors, and clients I've had the privilege to work with.
                    </p>
                </m.div>

                {/* Focused Slider Card */}
                <div className="relative max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        <m.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="relative rounded-[2.5rem] p-8 md:p-14 border border-border/50 overflow-hidden group shadow-2xl backdrop-blur-md"
                            style={{
                                background: "linear-gradient(145deg, hsl(var(--card) / 0.4) 0%, hsl(var(--card) / 0.6) 100%)",
                            }}
                        >
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                            {/* Quote icon */}
                            <Quote
                                className="w-16 h-16 mb-8 opacity-10 text-primary absolute top-10 right-10"
                            />

                            <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-12 items-center text-center md:text-left">
                                {/* Avatar */}
                                <div className="shrink-0">
                                    <div className="relative p-1 rounded-full bg-gradient-to-tr from-primary/40 to-transparent">
                                        {current.avatarUrl ? (
                                            <OptimizedImage
                                                src={current.avatarUrl}
                                                alt={current.name}
                                                width={120}
                                                height={120}
                                                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-3xl font-bold text-foreground bg-primary/5 backdrop-blur-md border border-primary/20 shadow-inner">
                                                {current.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed mb-8 italic" style={{ fontFamily: "var(--font-display)" }}>
                                        "{current.quote}"
                                    </p>

                                    <div>
                                        <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                            <h4 className="text-lg font-bold text-foreground tracking-wide">{current.name}</h4>
                                            {current.linkedinUrl && (
                                                <a href={current.linkedinUrl} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary transition-colors">
                                                    <Linkedin size={16} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-primary/60 text-sm font-bold tracking-widest uppercase">
                                            {current.role} {current.company && <span className="text-border mx-2">|</span>} {current.company}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </m.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-center gap-4 mt-10">
                        <button
                            onClick={() => { setIsAutoPlaying(false); setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length); }}
                            className="w-12 h-12 rounded-full bg-card/20 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 hover:border-primary/30 transition-all"
                            aria-label="Previous testimonial"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div className="flex gap-2">
                            {testimonials.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setIsAutoPlaying(false); setCurrentIndex(i); }}
                                    className={`w-2 h-2 rounded-full transition-all duration-500 ${i === currentIndex ? "w-8 bg-primary" : "bg-muted hover:bg-muted-foreground/20"}`}
                                    aria-label={`Go to testimonial ${i + 1}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => { setIsAutoPlaying(false); setCurrentIndex((prev) => (prev + 1) % testimonials.length); }}
                            className="w-12 h-12 rounded-full bg-card/20 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 hover:border-primary/30 transition-all"
                            aria-label="Next testimonial"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
