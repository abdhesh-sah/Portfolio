import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { Github, ExternalLink, Activity, GitBranch, Terminal, Star, GitPullRequest, GitCommit, Plus, AlertCircle, Zap } from "lucide-react";
import { Button } from "#src/components/ui/button";
import { apiFetch } from "#src/lib/api-helpers";
import { useToast } from "#src/hooks/use-toast";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { useTheme } from "#src/components/theme-provider";

import { formatDate } from "#src/lib/utils/date";
import { ContributionGrid, ContributionDay } from "./ContributionGrid";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#src/lib/query-keys";

type GitHubEvent = {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    commits?: { message: string }[];
    ref_type?: string;
    action?: string;
  };
};

type ActivityItem = {
  task: string;
  time: string;
  type: string;
};

export default function CodeAndPractice() {
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { reducedMotion } = useTheme();

  const { data: settings } = useSiteSettings();
  // const githubUsername = settings?.socialGithub?.match(/github\.com\/([^/]+)/)?.[1] || "portfolio-owner";

  const { data: githubData, isLoading: isContributionsLoading } = useQuery<{ total: number, contributions: ContributionDay[] }>({
    queryKey: QUERY_KEYS.github.contributions,
    queryFn: async () => {
      const response = await fetch("/api/v1/github/contributions");
      if (!response.ok) throw new Error("Failed to fetch contributions");
      return response.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  useEffect(() => {
    apiFetch("/api/v1/github/activity")
      .then((data: GitHubEvent[]) => {
        if (!Array.isArray(data)) {
          setIsLoading(false);
          return;
        }

        const filtered = data
          .map(e => {
            const date = formatDate(e.created_at, { month: 'short', day: 'numeric' });

            // Handle different event types
            if (e.type === "PushEvent") {
              // Try to get specific commit messages
              const commits = e.payload?.commits;
              if (Array.isArray(commits) && commits.length > 0) {
                return commits.map(c => ({
                  task: `Pushed: ${c.message}`,
                  time: date,
                  type: "push"
                }));
              }
              // Fallback if no commits in payload
              return [{
                task: `Pushed to ${e.repo.name}`,
                time: date,
                type: "push"
              }];
            } else if (e.type === "CreateEvent") {
              return [{
                task: `Created ${e.payload.ref_type || 'repository'} in ${e.repo.name}`,
                time: date,
                type: "create"
              }];
            } else if (e.type === "WatchEvent") {
              return [{
                task: `Starred ${e.repo.name}`,
                time: date,
                type: "star"
              }];
            } else if (e.type === "IssuesEvent") {
              return [{
                task: `${e.payload.action} an issue in ${e.repo.name}`,
                time: date,
                type: "issue"
              }];
            } else if (e.type === "ForkEvent") {
              return [{
                task: `Forked ${e.repo.name}`,
                time: date,
                type: "fork"
              }];
            } else if (e.type === "ReleaseEvent") {
              return [{
                task: `Released ${e.payload.ref_type || 'version'} of ${e.repo.name}`,
                time: date,
                type: "release"
              }];
            }
            return [];
          })
          .flat() // Flatten the array of arrays
          .filter(item => item.task) // Remove empty/null tasks
          .slice(0, 4); // Show top 4 items

        setEvents(filtered);
        setIsLoading(false);
      })
      .catch(err => {
        setIsLoading(false);
        console.error("GitHub fetch failed:", err);
        toast({
          title: "Activity update failed",
          description: "Could not fetch recent GitHub activity.",
          variant: "destructive"
        });
      });
  }, []);

  return (
    <section id="code-practice" className="section-container">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
          {settings?.practiceHeading || "Code & Practice"}
        </h2>
        <div className="h-1.5 w-20 bg-primary mx-auto rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <m.div
            initial={reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold flex items-center gap-3 text-white">
              <Terminal className="w-6 h-6 text-primary" />
              Continuous Learning
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Beyond my featured projects, I maintain a consistent habit of experimentation and practice. My GitHub profile serves as a digital laboratory where I explore new patterns, test frameworks, and refine my engineering skills.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-primary/10 rounded-full text-primary">
                  <GitBranch className="w-4 h-4" />
                </div>
                <p className="text-muted-foreground">Daily commits to open-source and personal repositories.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-primary/10 rounded-full text-primary">
                  <Activity className="w-4 h-4" />
                </div>
                <p className="text-muted-foreground">Experiments with microservices, CLI tools, and system optimization.</p>
              </div>
            </div>

            <div className="pt-4">
              <a
                href={settings?.socialGithub || "https://github.com/"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="gap-2 rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20">
                  <Github className="w-5 h-5" />
                  Visit GitHub Profile
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </Button>
              </a>
            </div>
          </m.div>

          <m.div
            initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/5 rounded-3xl -rotate-2" />
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md p-8 rounded-3xl border border-primary/20 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold">Recent Activity</div>
                    <div className="text-xs text-muted-foreground">Updated daily</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
                  Live Feed
                </div>
              </div>

              <div className="space-y-6">
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-4 items-start animate-pulse">
                      <div className="mt-1 w-4 h-4 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-white/5 rounded w-1/4" />
                      </div>
                    </div>
                  ))
                ) : (
                  events.length > 0 ? events.map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="mt-1">
                        {item.type === "push" && <GitCommit className="w-4 h-4 text-primary" />}
                        {item.type === "star" && <Star className="w-4 h-4 text-yellow-500" />}
                        {item.type === "create" && <Plus className="w-4 h-4 text-green-500" />}
                        {item.type === "pr" && <GitPullRequest className="w-4 h-4 text-purple-500" />}
                        {item.type === "issue" && <AlertCircle className="w-4 h-4 text-orange-400" />}
                        {item.type === "fork" && <GitBranch className="w-4 h-4 text-purple-400" />}
                        {item.type === "release" && <Zap className="w-4 h-4 text-cyan-400" />}
                        {!["push", "star", "create", "pr", "issue", "fork", "release"].includes(item.type) && <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium line-clamp-2">{item.task}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.time}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-muted-foreground">No recent activity found.</div>
                  )
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-border/50">
                <div className="relative group min-h-[128px]">
                  {!reducedMotion && <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>}
                  <div className="relative bg-primary/5 backdrop-blur-sm rounded-lg p-1 border border-primary/10">
                    {isContributionsLoading ? (
                      <div className="w-full h-32 animate-pulse bg-white/5 rounded-lg flex items-center justify-center">
                        <Github className="w-8 h-8 text-white/10 animate-bounce" />
                      </div>
                    ) : (
                      githubData?.contributions && (
                        <ContributionGrid 
                          contributions={githubData.contributions} 
                          variant="cyan" 
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-4 text-[10px] text-muted-foreground font-mono">
                  <span>LESS</span>
                  <span className="text-cyan-400/50">CONTRIBUTION GRAPH</span>
                  <span>MORE</span>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
