import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Code2 } from 'lucide-react';
import { fadeUp, expand, DURATION, EASE, STAGGER } from '#src/lib/animation';
import type { SkillNode } from './SkillTypes';

interface SkillsListViewProps {
  skillNodes: SkillNode[];
}

const STATUS_COLORS: Record<string, { badge: string; dot: string }> = {
  Core: { badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-400' },
  Comfortable: { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  Advanced: { badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30', dot: 'bg-amber-500' },
  Learning: { badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30', dot: 'bg-pink-400' },
};

const DEFAULT_STATUS_COLOR = { badge: 'bg-gray-500/15 text-gray-400 border-gray-500/30', dot: 'bg-gray-400' };



export function SkillsListView({ skillNodes }: SkillsListViewProps) {
  // Dynamically derive categories from the actual skills
  const dynamicCategories = Array.from(new Set(skillNodes.map(n => n.category)));

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(dynamicCategories)
  );
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const grouped = dynamicCategories.reduce<Record<string, SkillNode[]>>(
    (acc, cat) => {
      acc[cat] = skillNodes.filter((n) => n.category === cat);
      return acc;
    },
    {} as Record<string, SkillNode[]>
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleSkill = (id: string) => {
    setExpandedSkill((prev) => (prev === id ? null : id));
  };

  if (skillNodes.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-border bg-foreground/5">
        <p className="text-4xl mb-3">🧩</p>
        <h3 className="text-lg font-medium text-foreground mb-2">Capabilities syncing...</h3>
        <p className="text-sm text-muted-foreground">Skill data is currently being calibrated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Skills by category">
      {dynamicCategories.map((category, catIdx) => {
        const skills = grouped[category];
        if (!skills || skills.length === 0) return null;
        const isExpanded = expandedCategories.has(category);

        return (
          <m.div
            key={category}
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={{ duration: DURATION.fast, delay: catIdx * STAGGER.normal }}
            className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md overflow-hidden"
            role="listitem"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
              aria-expanded={isExpanded}
              aria-controls={`skills-cat-${category}`}
            >
              <span className="font-semibold text-sm tracking-wide text-foreground/90">
                {category}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{skills.length}</span>
                <m.span
                  animate={{ rotate: isExpanded ? 0 : -90 }}
                  transition={{ duration: DURATION.instant, ease: EASE.easeOut }}
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </m.span>
              </span>
            </button>

            {/* Skills List */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <m.div
                  id={`skills-cat-${category}`}
                  key={`cat-${category}`}
                  initial={expand.initial}
                  animate={expand.animate}
                  exit={expand.initial}
                  transition={{ duration: DURATION.fast, ease: EASE.easeInOut }}
                  className="overflow-hidden"
                  role="list"
                >
                  <div className="px-3 pb-3 space-y-1">
                    {skills.map((skill) => {
                      const Icon = skill.icon || Code2;
                      const statusStyle = STATUS_COLORS[skill.status] || DEFAULT_STATUS_COLOR;
                      const isSkillExpanded = expandedSkill === skill.id;

                      return (
                        <div key={skill.id} role="listitem">
                          <button
                            onClick={() => toggleSkill(skill.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-foreground/5 active:bg-foreground/10 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            aria-expanded={isSkillExpanded}
                            aria-controls={`skill-detail-${skill.id}`}
                          >
                            <span className="shrink-0 w-8 h-8 rounded-md bg-foreground/5 border border-border flex items-center justify-center">
                              <Icon className="w-4 h-4 text-foreground/70" />
                            </span>
                            <span className="flex-1 text-sm font-medium text-foreground/85">
                              {skill.name}
                            </span>
                            <span
                              className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full border ${statusStyle.badge}`}
                            >
                              {skill.status}
                            </span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${isSkillExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>

                          <AnimatePresence initial={false}>
                            {isSkillExpanded && (
                              <m.div
                                id={`skill-detail-${skill.id}`}
                                key={`detail-${skill.id}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: DURATION.fast, ease: EASE.easeInOut }}
                                className="overflow-hidden"
                              >
                                <div className="ml-11 mr-3 mb-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                                  {skill.mastery !== undefined && (
                                    <div className="mb-3">
                                      <div className="flex justify-between items-center mb-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                        <span>Mastery</span>
                                        <span>{skill.mastery}%</span>
                                      </div>
                                      <div className="h-1 w-full bg-gray-800/50 rounded-full overflow-hidden">
                                        <m.div
                                          className={`h-full bg-current ${statusStyle.badge.split(' ').find(c => c.startsWith('text-'))}`}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${skill.mastery}%` }}
                                          transition={{ duration: 1, ease: 'easeOut' }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-foreground/70 leading-relaxed mb-1.5">
                                    {skill.description}
                                  </p>
                                  <p className="text-muted-foreground italic">
                                    {skill.proof}
                                  </p>
                                </div>
                              </m.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        );
      })}
    </div>
  );
}
