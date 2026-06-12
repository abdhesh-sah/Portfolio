import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiFetch } from "#src/lib/api-helpers";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { QUERY_KEYS } from "#src/lib/query-keys";
import { seoSettingsSchema } from "#shared";

interface SeoProps {
    slug?: string;
    title?: string;
    description?: string;
    image?: string;
    keywords?: string;
    type?: string;
    noindex?: boolean;
    structuredData?: Record<string, unknown> | Record<string, unknown>[];
    prev?: string;
    next?: string;
}

export function SEO({
    slug,
    title: propTitle,
    description: propDescription,
    image: propImage,
    keywords: propKeywords,
    type = "website",
    noindex: propNoindex,
    structuredData,
    prev,
    next,
}: SeoProps) {
    const [location] = useLocation();
    const { data: seoSettings } = useQuery({
        queryKey: QUERY_KEYS.seo(slug),
        queryFn: async () => {
            if (!slug) return null;
            try {
                return await apiFetch(`/api/v1/seo/${slug}`, {}, seoSettingsSchema);
            } catch (error: unknown) {
                if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 404) return null;
                throw error;
            }
        },
        enabled: !!slug,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const { data: settings } = useSiteSettings();
    const displayName = settings?.personalName || "Portfolio Owner";

    const title = seoSettings?.metaTitle || propTitle || `${displayName} | Portfolio`;
    const description =
        seoSettings?.metaDescription ||
        propDescription ||
        `Portfolio of ${displayName}, a Full Stack Developer.`;
    const siteUrl = import.meta.env.VITE_SITE_URL;
    const apiUrl = import.meta.env.VITE_API_URL;
    
    // Dynamic OG Image Fallback
    const dynamicOgUrl = `${apiUrl}/api/v1/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=${type}`;
    
    const image = seoSettings?.ogImage || propImage || dynamicOgUrl;
    const keywords = seoSettings?.keywords || propKeywords || "";
    const noindex = seoSettings?.noindex ?? propNoindex ?? false;
    const twitterCard = seoSettings?.twitterCard || "summary_large_image";
    const canonicalUrl = seoSettings?.canonicalUrl || (siteUrl ? `${siteUrl}${location}` : undefined);

    const safeJsonLd = (data: Record<string, unknown>) => {
        return JSON.stringify(data)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026')
            .replace(/'/g, '\\u0027');
    };

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{title}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            {noindex && <meta name="robots" content="noindex,nofollow" />}
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
            {prev && <link rel="prev" href={prev} />}
            {next && <link rel="next" href={next} />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={seoSettings?.ogTitle || title} />
            <meta
                property="og:description"
                content={seoSettings?.ogDescription || description}
            />
            <meta property="og:image" content={image} />
            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

            {/* Twitter */}
            <meta name="twitter:card" content={twitterCard} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* Structured Data (JSON-LD) */}
            {structuredData && (
                Array.isArray(structuredData) ? (
                    structuredData.map((data, i) => (
                        <script key={(data as Record<string, unknown>)['@type'] as string || i} type="application/ld+json">
                            {safeJsonLd(data)}
                        </script>
                    ))
                ) : (
                    <script type="application/ld+json">
                        {safeJsonLd(structuredData)}
                    </script>
                )
            )}
        </Helmet>
    );
}
