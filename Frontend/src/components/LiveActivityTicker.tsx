import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Terminal, GitCommit, FileCode, Plus, Minus, Activity, ExternalLink } from "lucide-react";

import { apiFetch } from "#src/lib/api-helpers";

interface CommitFile {
  filename: string;
  additions: number;
  deletions: number;
  status: string;
}

interface LatestActivity {
  status: "active" | "idle" | "error";
  repo?: string;
  message?: string;
  sha?: string;
  date?: string;
  files?: CommitFile[];
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
}

export const LiveActivityTicker: React.FC = () => {
  const { data: activity, isLoading } = useQuery<LatestActivity>({
    queryKey: ["github-latest-detail"],
    queryFn: () => apiFetch("/api/v1/github/activity/latest"),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading || !activity || activity.status !== "active") {
    return null;
  }

  return (
    <div className="w-full py-12">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto rounded-2xl bg-[#0d1117] border border-[#30363d] overflow-hidden shadow-2xl font-mono text-xs"
        >
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <span className="text-[#8b949e] ml-2 flex items-center gap-1.5">
                <Terminal className="w-3 h-3" />
                Live: {activity.repo}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#8b949e]">
               <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
               LIVE_FEED
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <GitCommit className="w-4 h-4 text-purple-400 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[#8b949e]">
                  commit <span className="text-yellow-500">{activity.sha}</span>
                </div>
                <div className="text-white font-bold text-sm">
                  {activity.message}
                </div>
              </div>
            </div>

            <div className="pl-7 space-y-3">
              <div className="flex items-center gap-2 text-[#8b949e]">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                Changed Files:
              </div>
              <div className="space-y-2">
                {activity.files?.map((file, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="text-[#58a6ff] hover:underline cursor-pointer">
                      {file.filename}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-emerald-400">
                         <Plus className="w-3 h-3" />
                         {file.additions}
                      </div>
                      <div className="flex items-center gap-1 text-red-400">
                         <Minus className="w-3 h-3" />
                         {file.deletions}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {activity.stats && (
                <div className="pt-4 mt-4 border-t border-[#30363d] flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-[#8b949e]">
                  <div className="flex items-center gap-4">
                     <span>Total Changes: {activity.stats.total}</span>
                     <a 
                       href={`https://github.com/${activity.repo}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-[#58a6ff] hover:underline flex items-center gap-1"
                     >
                       View Repo <ExternalLink className="w-2.5 h-2.5" />
                     </a>
                  </div>
                  <div className="flex items-center gap-3 italic">
                    <Activity className="w-2.5 h-2.5 text-primary" />
                    Powered by GitHub & Analytics API
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-1.5 rounded-full bg-[#30363d] overflow-hidden flex">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(activity.stats.additions / activity.stats.total) * 100}%` }} 
                        />
                        <div 
                          className="h-full bg-red-500" 
                          style={{ width: `${(activity.stats.deletions / activity.stats.total) * 100}%` }} 
                        />
                    </div>
                  </div>
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
