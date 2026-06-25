import { useMemo } from 'react';
import { m } from 'framer-motion';
import { SkillNode, Connection } from './SkillTypes';
import { useTheme } from '../theme-provider';

interface SkillsTreeSVGProps {
    highlightedConnections: Set<string>;
    highlightedNodes: Set<string>;
    skillNodes: SkillNode[];
    connections: Connection[];
}

export const SkillsTreeSVG = ({
    highlightedConnections,
    highlightedNodes,
    skillNodes,
    connections
}: SkillsTreeSVGProps) => {
    const { performanceMode, treePerformanceMode } = useTheme();
    const isLowPower = performanceMode === 'low';
    const isTreePower = treePerformanceMode === 'power' && !isLowPower;

    // 1. Optimize lookup time from O(N^2) to O(1)
    const nodePosMap = useMemo(() => {
        const map: Record<string, { x: number; y: number }> = {};
        for (let i = 0; i < skillNodes.length; i++) {
            const node = skillNodes[i];
            map[node.id] = { x: node.x, y: node.y };
        }
        return map;
    }, [skillNodes]);

    const getTrunkPoint = (nodeX: number, nodeY: number) => {
        // Clamp node y-coord to main trunk vertical span [28, 98]
        const trunkY = Math.max(28, Math.min(98, nodeY + Math.abs(nodeX - 50) * 0.35));

        // Trunk bezier control segments matching the main trunk path
        let p0, p1, p2, p3;
        if (trunkY >= 82) {
            p0 = { x: 50, y: 98 }; p1 = { x: 50, y: 92 }; p2 = { x: 48, y: 88 }; p3 = { x: 49, y: 82 };
        } else if (trunkY >= 64) {
            p0 = { x: 49, y: 82 }; p1 = { x: 50, y: 76 }; p2 = { x: 52, y: 70 }; p3 = { x: 51, y: 64 };
        } else if (trunkY >= 46) {
            p0 = { x: 51, y: 64 }; p1 = { x: 50, y: 58 }; p2 = { x: 48, y: 52 }; p3 = { x: 50, y: 46 };
        } else {
            p0 = { x: 50, y: 46 }; p1 = { x: 52, y: 40 }; p2 = { x: 50, y: 34 }; p3 = { x: 50, y: 28 };
        }

        // Interpolate y monotonically to find parameter t safely
        const denominator = p0.y - p3.y;
        const t = denominator === 0 ? 0 : Math.max(0, Math.min(1, (p0.y - trunkY) / denominator));
        const oneMinusT = 1 - t;

        // Evaluate Cubic Bezier for x
        const trunkX =
            oneMinusT * oneMinusT * oneMinusT * p0.x +
            3 * oneMinusT * oneMinusT * t * p1.x +
            3 * oneMinusT * t * t * p2.x +
            t * t * t * p3.x;

        return { x: trunkX, y: trunkY };
    };

    // Shared path string for main trunk
    const trunkPathD = "M 50 98 C 50 92, 48 88, 49 82 C 50 76, 52 70, 51 64 C 50 58, 48 52, 50 46 C 52 40, 50 34, 50 28";

    return (
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id="trunkGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#2d1b4e" stopOpacity="1" />
                    <stop offset="30%" stopColor="#4c1d95" stopOpacity="1" />
                    <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="var(--color-purple-light, #c084fc)" stopOpacity="0.6" />
                </linearGradient>

                <linearGradient id="branchGradientRight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--color-purple-light, #c084fc)" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="branchGradientLeft" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--color-purple-light, #c084fc)" stopOpacity="0.15" />
                </linearGradient>

                <linearGradient id="branchGradientRightHighlighted" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="branchGradientLeftHighlighted" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.4" />
                </linearGradient>

                <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="0.8" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <filter id="treeHighGlow" x="-200%" y="-200%" width="500%" height="500%">
                    <feGaussianBlur stdDeviation="3" result="blur1" />
                    <feGaussianBlur stdDeviation="5" result="blur2" />
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 2 0" />
                    <feMerge>
                        <feMergeNode in="blur1" />
                        <feMergeNode in="blur2" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <filter id="superGlow" x="-300%" y="-300%" width="700%" height="700%">
                    <feGaussianBlur stdDeviation="4" result="blur1" />
                    <feGaussianBlur stdDeviation="8" result="blur2" />
                    <feGaussianBlur stdDeviation="15" result="blur3" />
                    <feColorMatrix type="matrix" values="1.2 0 0 0 0.1  0 1.2 0 0 0.1  0 0 1.5 0 0.2  0 0 0 2.5 0" />
                    <feMerge>
                        <feMergeNode in="blur1" />
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur3" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <linearGradient id="crystalGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="1" />
                    <stop offset="40%" stopColor="#00d4ff" stopOpacity="0.6" />
                    <stop offset="80%" stopColor="#a855f7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
                </linearGradient>
            </defs>

            {/* Main tree trunk */}
            <m.path
                d={trunkPathD}
                stroke="url(#trunkGradient)"
                strokeWidth={isTreePower ? 3 : 2.5}
                fill="none"
                strokeLinecap="round"
                filter={isTreePower ? 'url(#superGlow)' : 'none'}
                initial={{ pathLength: isLowPower ? 1 : 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                animate={isTreePower ? {
                    strokeWidth: [3, 3.5, 3],
                    opacity: [0.9, 1, 0.9],
                } : {}}
                viewport={{ once: true }}
                transition={isTreePower ? {
                    pathLength: { duration: 2, ease: 'easeOut' },
                    opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    strokeWidth: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                } : { duration: isLowPower ? 0.5 : 2, ease: 'easeOut' }}
            />

            {/* Dynamic trunk-to-skill branches */}
            {skillNodes.map((node) => {
                const trunkPt = getTrunkPoint(node.x, node.y);
                const isHighlighted = highlightedNodes.has(node.id);
                const isRightSide = node.x >= 50;
                
                const gradientId = isHighlighted
                    ? (isRightSide ? 'branchGradientRightHighlighted' : 'branchGradientLeftHighlighted')
                    : (isRightSide ? 'branchGradientRight' : 'branchGradientLeft');

                const dx = node.x - trunkPt.x;
                const dy = node.y - trunkPt.y;
                
                // Optimized organic control points to exit trunk at a natural slight angle
                const control1X = trunkPt.x + dx * 0.5;
                const control1Y = trunkPt.y + dy * 0.1;
                const control2X = node.x - dx * 0.2;
                const control2Y = node.y;

                const pathD = `M ${trunkPt.x} ${trunkPt.y} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${node.x} ${node.y}`;

                return (
                    <g key={`branch-${node.id}`}>
                        {/* Glowing branch joint / node at trunk intersection */}
                        <m.circle
                            cx={trunkPt.x}
                            cy={trunkPt.y}
                            r={isHighlighted ? 0.5 : 0.35}
                            fill={isHighlighted ? "#00d4ff" : "#7c3aed"}
                            filter="url(#connectionGlow)"
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: isHighlighted ? 1 : 0.7 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: isLowPower ? 0 : 0.2 }}
                        />

                        {/* Outer Glow / Sheath Path for Premium Depth */}
                        <m.path
                            d={pathD}
                            stroke={isHighlighted ? 'rgba(0, 212, 255, 0.25)' : 'rgba(124, 58, 237, 0.12)'}
                            strokeWidth={isHighlighted ? 2.4 : (isTreePower ? 1.6 : 1.2)}
                            fill="none"
                            strokeLinecap="round"
                            filter={isTreePower ? 'url(#treeHighGlow)' : 'none'}
                            initial={{ pathLength: isLowPower ? 1 : 0, opacity: 0 }}
                            whileInView={{ pathLength: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: isLowPower ? 0.3 : 1.0, delay: isLowPower ? 0 : 0.4 }}
                        />

                        {/* Inner Bright Core Path */}
                        <m.path
                            d={pathD}
                            stroke={`url(#${gradientId})`}
                            strokeWidth={isHighlighted ? 1.2 : (isTreePower ? 0.8 : 0.6)}
                            fill="none"
                            strokeLinecap="round"
                            filter={isTreePower && isHighlighted ? 'url(#connectionGlow)' : 'none'}
                            initial={{ pathLength: isLowPower ? 1 : 0, opacity: 0 }}
                            whileInView={{ pathLength: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: isLowPower ? 0.3 : 1.0, delay: isLowPower ? 0 : 0.5 + Math.random() * 0.4 }}
                        />

                        {/* Branch Energy Pulses in Power Mode */}
                        {isTreePower && (
                            <m.circle
                                r={isHighlighted ? 0.22 : 0.16}
                                fill={isHighlighted ? "#00d4ff" : "#a855f7"}
                                filter="url(#connectionGlow)"
                            >
                                <animateMotion
                                    dur={`${2.5 + Math.random() * 2}s`}
                                    repeatCount="indefinite"
                                    path={pathD}
                                />
                            </m.circle>
                        )}
                    </g>
                );
            })}

            {/* Connection lines */}
            {connections.map((conn) => {
                // Optimized fast Map Lookups
                const start = nodePosMap[conn.from] || { x: 0, y: 0 };
                const end = nodePosMap[conn.to] || { x: 0, y: 0 };
                
                const connectionKey = `${conn.from}-${conn.to}`;
                const isHighlighted = highlightedConnections.has(connectionKey);
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2 - 3;
                const pathD = `M ${start.x} ${start.y} Q ${midX} ${midY}, ${end.x} ${end.y}`;

                return (
                    <g key={`connection-${connectionKey}`}>
                        <m.path
                            d={pathD}
                            stroke={isHighlighted ? '#00d4ff' : (isTreePower ? 'rgba(168, 85, 247, 0.4)' : 'rgba(100, 100, 160, 0.25)')}
                            strokeWidth={isHighlighted ? 0.8 : (isTreePower ? 0.6 : 0.4)}
                            fill="none"
                            strokeLinecap="round"
                            filter={isTreePower ? (isHighlighted ? 'url(#connectionGlow)' : 'url(#treeHighGlow)') : 'none'}
                            initial={{ pathLength: isLowPower ? 1 : 0, opacity: 0 }}
                            whileInView={{ pathLength: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: isLowPower ? 0.3 : 0.8, delay: isLowPower ? 0 : 1.0 }}
                        />
                        {isTreePower && (
                            <m.circle
                                r="0.15"
                                fill="#00d4ff"
                                filter="url(#connectionGlow)"
                            >
                                <animateMotion
                                    dur={`${2 + Math.random() * 2}s`}
                                    repeatCount="indefinite"
                                    path={pathD}
                                />
                            </m.circle>
                        )}
                    </g>
                );
            })}

            {/* Crystalline roots */}
            <g filter={isTreePower ? 'url(#superGlow)' : 'none'}>
                <m.polygon
                    points="50,88 46,98 50,100 54,98"
                    fill="url(#crystalGradient)"
                    initial={{ opacity: 0, scaleY: 0 }}
                    whileInView={{ opacity: 1, scaleY: 1 }}
                    animate={isTreePower ? {
                        fill: ['#00d4ff', '#a855f7', '#00d4ff'],
                    } : {}}
                    viewport={{ once: true }}
                    transition={isTreePower ? {
                        fill: { duration: 3, repeat: Infinity, ease: "linear" }
                    } : { duration: 0.8, delay: isLowPower ? 0 : 1.8 }}
                    style={{ transformOrigin: '50% 100%' }}
                />
            </g>

            {/* Energy pulses along trunk in Power Mode */}
            {isTreePower && [1, 2].map((id) => (
                <m.circle
                    key={`pulse-${id}`}
                    r="0.3"
                    fill="#a855f7"
                    filter="url(#superGlow)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                >
                    <animateMotion
                        dur={`${3 + id}s`}
                        repeatCount="indefinite"
                        path={trunkPathD}
                    />
                </m.circle>
            ))}
        </svg>
    );
};