/**
 * Portfolio hooks - domain-separated barrel export.
 * All hooks are re-exported here for backwards compatibility.
 */
export { useProjects, useProjectById, useProjectVitals } from "./use-projects";
export { useSkills, useSkillConnections, useMindset } from "./use-skills";
export { useArticles, useArticle, useArticleSearch, useArticleReactions, useReactToArticle } from "./use-articles";
export { useExperiences } from "./use-experiences";
export { useServices } from "./use-services";
export { useTestimonials } from "./use-testimonials";
export { useMessages, useSendMessage } from "./use-contact";
export { useSubscribe, useUnsubscribe, useAdminSubscribers } from "./use-subscribers";
export { useAdminChatLogs } from "../admin/use-admin-chat";
export { useAnalyticsSummary, useVitalsSummary } from "./use-analytics";
export { useEmailTemplates } from "./use-email-templates";
export { useLogin } from "./use-auth";
export { useAuth } from "../auth-context";
export { useGuestbook, useSubmitGuestbook, useAdminGuestbook, useApproveGuestbook, useDeleteGuestbook, useReactToGuestbook } from "./use-guestbook";
export { useAdminMindset } from "../admin/use-admin-mindset";
export { useSiteSettings, useUpdateSiteSettings } from "../use-site-settings";
export { useAdminExperiences } from "../admin/use-admin-experiences";
export { useAdminServices } from "../admin/use-admin-services";
export { useAdminSkills } from "../admin/use-admin-skills";
export { useAdminProjects } from "../admin/use-admin-projects";
export { useReadingList, type ReadingItem } from "./use-reading-list";
