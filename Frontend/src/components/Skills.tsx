import React, { useState, useMemo, useCallback, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerChild } from '#src/lib/animation';
import { useSkills, useSkillConnections } from '#src/hooks/use-portfolio';
import { useSiteSettings } from '#src/hooks/use-site-settings';
import { Zap, Layers, Code2, Cpu } from 'lucide-react';
import { useTheme } from './theme-provider';

import { SkillStatus, SkillCategory } from './skills/SkillTypes';
import { ICON_MAP } from './skills/SkillData';
import { HexagonNode } from './skills/HexagonNode';
import { SkillTooltip } from './skills/SkillTooltip';
import { SkillsTreeSVG } from './skills/SkillsTreeSVG';
import { StatPanel, ProficiencyChart, CategorySummary } from './skills/StatPanels';
import { SkillsListView } from './skills/SkillsListView';

export default function SkillsTree() {
  const { treePerformanceMode, setTreePerformanceMode } = useTheme();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const { data: apiSkills } = useSkills();
  const { data: apiConnections } = useSkillConnections();
  const { data: settings } = useSiteSettings();

  // 1. Process Skills List cleanly with a clear fallback
  const skillNodes = useMemo(() => {
    if (!apiSkills) return [];
    return apiSkills.map(s => ({
      ...s,
      id: String(s.id),
      icon: ICON_MAP[s.icon] || Code2,
      status: s.status as SkillStatus,
      category: s.category as SkillCategory
    }));
  }, [apiSkills]);

  // 2. Map Nodes by unique key to change O(N) scans to lightning fast O(1) lookups
  const skillNodesMap = useMemo(() => {
    const map = new Map<string, typeof skillNodes[number]>();
    for (let i = 0; i < skillNodes.length; i++) {
      map.set(skillNodes[i].id, skillNodes[i]);
    }
    return map;
  }, [skillNodes]);

  const connections = useMemo(() => {
    if (!apiConnections) return [];
    return apiConnections.map(c => ({
      from: String(c.fromSkillId),
      to: String(c.toSkillId)
    }));
  }, [apiConnections]);

  // 3. Keep BFS calculation tracking fast and predictable
  const { highlightedConnections, highlightedNodes } = useMemo(() => {
    if (!activeNode) {
      return {
        highlightedConnections: new Set<string>(),
        highlightedNodes: new Set<string>()
      };
    }
    const connectionsSet = new Set<string>();
    const nodesSet = new Set<string>([activeNode]);
    const queue = [activeNode];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        if (conn.to === current && !nodesSet.has(conn.from)) {
          nodesSet.add(conn.from);
          connectionsSet.add(`${conn.from}-${conn.to}`);
          queue.push(conn.from);
        }
      }
    }
    return { highlightedConnections: connectionsSet, highlightedNodes: nodesSet };
  }, [activeNode, connections]);

  // 4. Wrap triggers in useCallback to prevent child nodes from dropping memo frames
  const handleNodeClick = useCallback((id: string) => {
    setActiveNode(id);
    setShowTooltip(true);
  }, []);

  const handleCloseTooltip = useCallback(() => {
    setShowTooltip(false);
    setActiveNode(null);
  }, []);

  const handleNodeHover = useCallback((id: string) => {
    setActiveNode(id);
  }, []);

  const handleNodeLeave = useCallback(() => {
    if (!showTooltip) {
      setActiveNode(null);
    }
  }, [showTooltip]);

  const togglePerformanceMode = useCallback(() => {
    setTreePerformanceMode(treePerformanceMode === 'power' ? 'normal' : 'power');
  }, [treePerformanceMode, setTreePerformanceMode]);

  // Instant O(1) pointer fetch
  const activeNodeData = activeNode ? skillNodesMap.get(activeNode) : null;
  const treeContainerRef = useRef<HTMLDivElement>(null);

  /** Arrow-key navigation between skill nodes based on spatial proximity */
  const handleTreeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();

      const container = treeContainerRef.current;
      if (!container) return;

      const focused = document.activeElement as HTMLElement;
      const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-skill-idx]'));
      const currentIdx = nodes.indexOf(focused);
      if (currentIdx === -1) return;

      const current = skillNodes[currentIdx];
      if (!current) return;

      let bestIdx = -1;
      let bestDist = Infinity;

      for (let i = 0; i < skillNodes.length; i++) {
        if (i === currentIdx) continue;
        const n = skillNodes[i];
        const dx = n.x - current.x;
        const dy = n.y - current.y;

        const isCandidate =
          (e.key === 'ArrowRight' && dx > 0) ||
          (e.key === 'ArrowLeft' && dx < 0) ||
          (e.key === 'ArrowDown' && dy > 0) ||
          (e.key === 'ArrowUp' && dy < 0);

        if (!isCandidate) continue;
        const dist = dx * dx + dy * dy; // Optimized: Avoid costly Math.sqrt operations
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      if (bestIdx !== -1 && nodes[bestIdx]) {
        nodes[bestIdx].focus();
        handleNodeClick(skillNodes[bestIdx].id);
      }
    },
    [skillNodes, handleNodeClick]
  );

  return (
    <section
      id="skills"
      className="relative min-h-screen py-16 md:py-24 overflow-hidden"
    >
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <m.div
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <m.h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
            {settings?.skillsHeading || "Skill Tree"}
          </m.h2>
          <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
              A verified map of my technical abilities
            </p>
            <button
              onClick={togglePerformanceMode}
              className={`group flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-500 ${
                treePerformanceMode === 'power'
                  ? 'bg-cyan-500 text-white border-none shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105'
                  : 'bg-primary/10 text-primary-foreground/60 border border-primary/20 hover:bg-primary/20'
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${treePerformanceMode === 'power' ? 'animate-spin-slow' : 'group-hover:rotate-12 transition-transform'}`} />
              <span className={treePerformanceMode === 'power' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}>
                {treePerformanceMode === 'power' ? 'Power Mode: MAXIMUM' : 'Power Mode: NORMAL'}
              </span>
            </button>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex justify-center mt-6 relative z-50">
            <div className="flex items-center bg-foreground/5 border border-border rounded-full p-1 shadow-lg">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === 'tree' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Hexagon Tree
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </m.div>

        {/* Mobile / List View */}
        <div className={viewMode === 'list' ? 'block' : 'hidden'}>
          <SkillsListView skillNodes={skillNodes} />
        </div>

        {/* Tree Container (Desktop / Tree mode) */}
        <m.div
          className={`relative w-full max-w-5xl mx-auto ${viewMode === 'tree' ? 'block' : 'hidden'}`}
          style={{ aspectRatio: '16 / 12' }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          ref={treeContainerRef}
          role="group"
          aria-label="Skill tree nodes — use arrow keys to navigate"
          onKeyDown={handleTreeKeyDown}
        >
          {skillNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full p-8 rounded-2xl border border-border bg-[#0d1117]/80 backdrop-blur-md shadow-2xl text-center space-y-4"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary/70">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                  Neural Pathways Offline
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No technical capabilities have been indexed yet. Populate your capabilities in the administrative panel.
                </p>
              </m.div>
            </div>
          ) : (
            <>
              <SkillsTreeSVG
                highlightedConnections={highlightedConnections}
                highlightedNodes={highlightedNodes}
                skillNodes={skillNodes}
                connections={connections}
              />

              {/* Skill Nodes */}
              <m.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
              >
                {skillNodes.map((node, idx) => (
                  <HexagonNode
                    key={node.id}
                    node={node}
                    isActive={activeNode === node.id}
                    onClick={() => handleNodeClick(node.id)}
                    onHover={() => handleNodeHover(node.id)}
                    onLeave={handleNodeLeave}
                    data-skill-idx={idx}
                  />
                ))}
              </m.div>

              {/* Stat Panels */}
              <div className="hidden lg:block">
                <StatPanel
                  title="Proficiency"
                  position="left"
                  icon={<Zap className="w-3 h-3 text-cyan-400" />}
                >
                  <ProficiencyChart skillNodes={skillNodes} />
                </StatPanel>

                <StatPanel
                  title="Categories"
                  position="right"
                  icon={<Layers className="w-3 h-3 text-purple-400" />}
                >
                  <CategorySummary skillNodes={skillNodes} />
                </StatPanel>
              </div>
            </>
          )}
        </m.div>

        {/* Legend */}
        {skillNodes.length > 0 && (
          <m.div
            className="flex justify-center gap-4 md:gap-8 mt-6 md:mt-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { label: 'Core', color: 'var(--color-cyan, #06b6d4)' },
              { label: 'Comfortable', color: 'var(--color-purple, #a855f7)' },
              { label: 'Learning', color: '#ec4899' }
            ].map((item) => (
              <m.div 
                key={item.label} 
                variants={staggerChild}
                className="flex items-center gap-2"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}80`
                  }}
                />
                <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
              </m.div>
            ))}
          </m.div>
        )}
      </div>

      {/* Tooltip Modal */}
      <AnimatePresence>
        {showTooltip && activeNodeData && (
          <SkillTooltip node={activeNodeData} onClose={handleCloseTooltip} />
        )}
      </AnimatePresence>
    </section>
  );
}