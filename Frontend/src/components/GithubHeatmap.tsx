import React from "react";
import { useQuery } from "@tanstack/react-query";

import { motion } from "framer-motion";
import { Info, ExternalLink } from "lucide-react";
import { Github } from "#src/components/icons/brand-icons";

import { useSiteSettings } from "#src/hooks/use-site-settings";
import { QUERY_KEYS } from "#src/lib/query-keys";

import { ContributionGrid, ContributionDay } from "./ContributionGrid";

interface ContributionData {
    total: number;
    contributions: ContributionDay[];
}

export const GithubHeatmap: React.FC = () => {
    const { data: settings } = useSiteSettings();
    const { data, isLoading, isError } = useQuery<ContributionData>({
        queryKey: QUERY_KEYS.github.contributions,
        queryFn: async () => {
            const response = await fetch("/api/v1/github/contributions");
            if (!response.ok) throw new Error("Failed to fetch contributions");
            return response.json();
        },
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
    });

    if (isLoading) {
        return (
            <div className="w-full h-48 bg-white/5 animate-pulse rounded-3xl border border-white/10 flex items-center justify-center">
                <Github className="w-8 h-8 text-white/10 animate-bounce" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="w-full md:h-48 p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center gap-4 text-center">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <Github className="w-6 h-6 text-red-400 opacity-50" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white/80">Unable to load GitHub activity</h3>
                    <p className="text-xs text-white/40">The contributions API is temporarily unavailable. Check back later.</p>
                </div>
            </div>
        );
    }

    if (!data?.contributions) return null;

    // Filter last 12 months or just enough to fill a nice grid
    // The API usually returns a full year
    const contributions = data.contributions || [];
    const totalCount = typeof data.total === 'number' ? data.total : 0;



    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full relative group"
        >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            
            <div className="relative p-6 md:p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <Github className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Open Source Activity</h3>
                            <p className="text-xs text-white/40 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {totalCount.toLocaleString()} contributions in the last year
                            </p>
                        </div>
                    </div>
                    
                    <a 
                        href={settings?.socialGithub ?? "https://github.com"} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs group/link"
                    >
                        View Profile
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>

                <ContributionGrid contributions={contributions} variant="emerald" />

                <div className="flex items-center justify-between mt-6 text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500/20" />
                            <span>Sprint</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Peak</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        <span>Updated Daily</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
