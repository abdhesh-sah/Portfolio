import { m, useReducedMotion } from "framer-motion";
import { useServices } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { Sparkles, ChevronRight, Layers } from "lucide-react";
import type { Service } from "#shared";

function getFallbackServices() {
  return [
    {
      id: 1,
      title: "Backend & API Architecture",
      summary:
        "Design and implement robust, observable backend services with clean boundaries, typed contracts, and a focus on reliability.",
      category: "Backend",
      tags: ["Node.js", "TypeScript", "Postgres", "Drizzle ORM"],
      isFeatured: true,
      displayOrder: 0,
    },
    {
      id: 2,
      title: "System Design & Scalability",
      summary:
        "Help you go from idea to production-ready architecture: data modeling, caching, background work, queues, and failure handling.",
      category: "Systems",
      tags: ["System Design", "Performance", "Observability"],
      isFeatured: false,
      displayOrder: 1,
    },
    {
      id: 3,
      title: "Full-Stack Product Delivery",
      summary:
        "Own features end-to-end across frontend, backend, and deployment, with a strong bias toward clean UX and maintainable code.",
      category: "Full-Stack",
      tags: ["React", "Vite", "Tailwind", "DX"],
      isFeatured: false,
      displayOrder: 2,
    },
  ];
}

export default function Services() {
  const { data, isLoading, error } = useServices();
  const { data: settings } = useSiteSettings();
  const shouldReduceMotion = useReducedMotion();

  const services = (data && data.length > 0 ? (data as Service[]) : (getFallbackServices() as unknown as Service[])).slice().sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );

  return (
    <section id="services" className="relative py-20 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <m.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{
              background: "rgba(6,182,212,0.1)",
              border: "1px solid rgba(6,182,212,0.3)",
            }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">
              How I can help
            </span>
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{
              background:
                "linear-gradient(135deg, #a5f3fc 0%, #06b6d4 40%, #3b82f6 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {settings?.servicesHeading || "Services & Collaboration"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Concrete ways I can contribute to your team or product. Each
            service maps directly to the skills and case studies you see on this
            page.
          </p>
        </m.div>

        {error && (
          <p className="text-center text-xs text-red-400 mb-4">
            Failed to load services from backend. Showing defaults.
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {(isLoading ? (getFallbackServices() as unknown as Service[]) : services).map((svc, index) => (
            <m.div
              key={svc.id ?? index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={
                shouldReduceMotion ? { duration: 0 } : { delay: index * 0.05 }
              }
              className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md border border-primary/20 p-5 flex flex-col group card-glow-hover transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {svc.title}
                    </h3>
                    <p className="text-[11px] text-cyan-400/80 uppercase tracking-wide">
                      {svc.category}
                    </p>
                  </div>
                </div>
                {svc.isFeatured && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-400/40">
                    Featured
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                {svc.summary}
              </p>

              <div className="flex flex-wrap gap-1 mb-4">
                {(svc.tags ?? []).slice(0, 5).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-200 border border-cyan-500/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-cyan-500/15 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] text-cyan-200/80">
                  {svc.priceMin ? (
                    <span className="font-bold text-cyan-400">
                      Starts at ${svc.priceMin.toLocaleString()}
                    </span>
                  ) : (
                    <span className="opacity-60">Custom Pricing</span>
                  )}
                  {!svc.ctaUrl && <ChevronRight className="w-3 h-3" />}
                </div>

                {svc.ctaUrl && (
                  <m.a
                    href={svc.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold text-center shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    Book a 30-min call
                    <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </m.a>
                )}
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}

