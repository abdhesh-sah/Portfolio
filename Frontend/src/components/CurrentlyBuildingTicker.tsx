import React from "react";
import { useLatestCommit } from "../hooks/use-latest-commit";
import { useProjects } from "../hooks/use-portfolio";
import { ExternalLink, Cpu, Terminal, Sparkles } from "lucide-react";
import { Github } from "#src/components/icons/brand-icons";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

import { formatDate } from "#src/lib/utils/date";

export const CurrentlyBuildingTicker: React.FC = () => {
    const { data: commitData, isLoading: isCommitLoading } = useLatestCommit();
    const { data: projects, isLoading: isProjectsLoading } = useProjects();

    const isLoading = isCommitLoading || isProjectsLoading;

    if (isLoading) {
        return null; // Keep loading silent
    }

    const hasCommit = commitData && commitData.repo !== "N/A";
    const latestProject = projects?.[0];
    const hasData = hasCommit || latestProject;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto mb-8 px-4"
        >
            <div className="relative group">
                {/* Background Glass Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                    {/* Live/Activity Indicator */}
                    <div className="flex items-center gap-3 shrink-0">
                        {hasData ? (
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </div>
                        ) : (
                            <div className="h-3 w-3 rounded-full bg-slate-600" />
                        )}
                        <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">
                            {hasCommit ? "Currently Building" : hasData ? "Latest Project" : "Latest Activity"}
                        </span>
                        {hasCommit ? <Github className="w-5 h-5 text-gray-400" /> : <Sparkles className="w-5 h-5 text-purple-400" />}
                    </div>

                    {/* Separator */}
                    <div className="hidden md:block w-px h-6 bg-white/10"></div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {hasCommit ? (
                            <>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-white/90 truncate">{commitData.repo}</span>
                                    <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-tighter">
                                        {formatDate(commitData.date)}
                                    </span>
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={commitData.aiSummary || commitData.message}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="text-xs text-gray-300 leading-relaxed italic"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {commitData.aiSummary ? (
                                                <>
                                                    <Cpu className="w-3 h-3 text-purple-400" />
                                                    {commitData.aiSummary}
                                                </>
                                            ) : (
                                                commitData.message
                                            )}
                                        </span>
                                    </motion.p>
                                </AnimatePresence>
                            </>
                        ) : latestProject ? (
                            <>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-white/90 truncate">{latestProject.title}</span>
                                    <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-tighter">
                                        Recently Updated
                                    </span>
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed italic truncate">
                                    {latestProject.description}
                                </p>
                            </>
                        ) : (
                            <div className="py-2">
                                <p className="text-xs text-gray-400 font-mono tracking-tight flex items-center gap-2">
                                    <Terminal className="w-3 h-3 text-cyan-500" />
                                    Synchronizing developer activity stream... github connection pending.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action */}
                    {hasCommit ? (
                        <a
                            href={commitData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group/link"
                        >
                            <span className="text-[10px] font-medium text-gray-400 group-hover/link:text-white transition-colors">View Commit</span>
                            <ExternalLink className="w-3 h-3 text-gray-500 group-hover/link:text-white transition-colors" />
                        </a>
                    ) : latestProject ? (
                        <Link href={`/project/${latestProject.id}`}>
                            <a className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group/link">
                                <span className="text-[10px] font-medium text-gray-400 group-hover/link:text-white transition-colors">View Detail</span>
                                <ExternalLink className="w-3 h-3 text-gray-500 group-hover/link:text-white transition-colors" />
                            </a>
                        </Link>
                    ) : null}
                </div>
            </div>
        </motion.div>
    );
};
