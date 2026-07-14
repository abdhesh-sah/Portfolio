/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import Navbar from "#src/components/Navbar";
import Footer from "#src/components/Footer";
import { SEO } from "#src/components/SEO";
import { TableOfContents } from "#src/components/TableOfContents";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { useCodeBlockCopy } from "#src/hooks/use-code-block-copy";
import type { ArticleWithRelated } from "#shared/schema";
import { useRoute } from "wouter";
import { m, useScroll, useSpring } from "framer-motion";
import { Badge } from "#src/components/ui/badge";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import { Button } from "#src/components/ui/button";
import { ArrowLeft, Link2, Check, Eye, Share2, MessageCircle } from "lucide-react";
import { Twitter, Linkedin } from "#src/components/icons/brand-icons";
import { Link } from "wouter";
import { useArticle, useReactToArticle } from "#src/hooks/use-portfolio";

import { OptimizedImage } from "#src/components/OptimizedImage";
import { NewsletterSignup } from "#src/components/NewsletterSignup";
import { ArticleReactions } from "#src/components/ArticleReactions";

function getPlainTextFromHtml(html: string): string {
    // Sanitize the HTML first to remove any potentially unsafe content
    const sanitized = DOMPurify.sanitize(html);

    // Use a temporary DOM element to extract plain text content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = sanitized;

    return tempDiv.textContent || tempDiv.innerText || "";
}

function PostSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <div className="space-y-4 pt-8">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
            </div>
        </div>
    );
}

import { formatDate } from "#src/lib/utils/date";
import { getDynamicOgImage } from "#src/lib/cloudinary";

export default function BlogPost() {
    const { data: settings } = useSiteSettings();
    const [, params] = useRoute("/blog/:slug");
    const slug = params?.slug;
    const { data: article, isLoading, error } = useArticle(slug || "");
    const { mutate: _react } = useReactToArticle();
    const [copied, setCopied] = useState(false);
    const articleRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Add copy-to-clipboard buttons on code blocks after content renders
    useCodeBlockCopy(articleRef, article?.content);

    // Related articles come from the article response itself (GET /:slug returns { ...article, relatedArticles })
    const relatedArticles = (article as ArticleWithRelated)?.relatedArticles || [];

    // Dynamic OG image generation
    const ogImage = article ? getDynamicOgImage(article.title, article.featuredImage || undefined) : undefined;

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy link:", err);
            // Fallback: alert or toast would go here if available
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="container mx-auto px-6 pt-32 pb-24">
                    <PostSkeleton />
                </main>
                <Footer />
            </div>
        );
    }

    if (!isLoading && (error || !article)) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="container mx-auto px-6 pt-32 pb-24 text-center">
                    <h1 className="text-3xl font-bold text-white mb-4">Post Not Found</h1>
                    <p className="text-white/40 mb-8">The article you're looking for doesn't exist or has been removed.</p>
                    <Link href="/blog">
                        <Button>Back to Blog</Button>
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    const authorName = settings?.personalName || "Portfolio Owner";
    const authorBio = settings?.personalBio || "Full Stack Engineer & Tech Enthusiast";

    return (
        <div className="min-h-screen selection:bg-primary/20 bg-background text-foreground" style={{ fontFamily: "var(--font-body)" }}>
            <SEO
                slug={`blog/${article!.slug}`}
                title={`${article!.title} | ${authorName}`}
                description={article!.excerpt || article!.title}
                image={ogImage}
                structuredData={[
                    {
                        "@context": "https://schema.org",
                        "@type": "TechArticle",
                        "headline": article!.title,
                        "image": article!.featuredImage ? [article!.featuredImage] : [],
                        "datePublished": article!.publishedAt,
                        "dateModified": article!.updatedAt,
                        "wordCount": article!.content ? getPlainTextFromHtml(article!.content).split(/\s+/).filter(Boolean).length : 0,
                        "author": {
                            "@type": "Person",
                            "name": authorName,
                            "url": import.meta.env.VITE_SITE_URL || window.location.origin
                        },
                        "publisher": {
                            "@type": "Person",
                            "name": authorName
                        },
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": `${import.meta.env.VITE_SITE_URL || window.location.origin}/blog/${article!.slug}`
                        }
                    },
                    {
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            {
                                "@type": "ListItem",
                                "position": 1,
                                "name": "Home",
                                "item": import.meta.env.VITE_SITE_URL || window.location.origin
                            },
                            {
                                "@type": "ListItem",
                                "position": 2,
                                "name": "Blog",
                                "item": `${import.meta.env.VITE_SITE_URL || window.location.origin}/blog`
                            },
                            {
                                "@type": "ListItem",
                                position: 3,
                                name: article!.title,
                                item: `${import.meta.env.VITE_SITE_URL || window.location.origin}/blog/${article!.slug}`
                            }
                        ]
                    }
                ]}
            />
            <m.div
                className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-[0%]"
                style={{ scaleX }}
            />
            <Navbar />

            <main className="container mx-auto px-6 pt-24 md:pt-32 pb-16 md:pb-24">
                <div className="max-w-4xl xl:max-w-6xl mx-auto">
                    <m.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8"
                    >
                        <Link href="/blog">
                            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white group">
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Back to Blog
                            </Button>
                        </Link>
                    </m.div>

                    <div className="flex gap-12">
                        {/* Main article content */}
                        <div className="flex-1 max-w-4xl">
                            <header className="mb-8 md:mb-12">
                                <m.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-wrap items-center gap-4 mb-6"
                                >
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                        {article!.publishedAt ? formatDate(article!.publishedAt, { month: "long", day: "numeric", year: "numeric" }) : "Draft"}
                                    </Badge>
                                    <span className="text-white/30 text-sm">{article!.readTimeMinutes || 5} min read</span>
                                    <span className="text-white/40 text-sm flex items-center gap-1.5">
                                        <Eye className="w-4 h-4" />
                                        {article!.viewCount || 0} views
                                    </span>
                                    {article!.tags?.map((tag: string) => (
                                        <span key={tag} className="text-xs text-white/40">#{tag}</span>
                                    ))}
                                </m.div>

                                <m.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 leading-tight"
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    {article!.title}
                                </m.h1>

                                {article!.featuredImage && (
                                    <m.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="aspect-video relative rounded-3xl overflow-hidden bg-white/5 border border-white/10"
                                    >
                                        <OptimizedImage
                                            src={article!.featuredImage}
                                            alt={article!.featuredImageAlt || `${article!.title} - Featured image for blog post`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                                    </m.div>
                                )}
                            </header>

                            <article
                                ref={articleRef}
                                className="prose prose-invert prose-purple max-w-none 
                        prose-headings:font-display prose-headings:font-bold prose-headings:text-white
                        prose-p:text-white/70 prose-p:leading-relaxed prose-p:text-base md:text-lg
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-white prose-code:text-primary prose-pre:bg-white/5
                        prose-img:rounded-2xl prose-img:border prose-img:border-white/10
                        animate-fade-in pt-4 md:pt-8"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article!.content) }}
                            />

                            {/* Share buttons */}
                            <ArticleReactions articleId={article!.id} reactions={article!.reactions || {}} />

                            {/* Share buttons */}
                            <div className="mt-12 flex flex-col gap-4">
                                <h3 className="text-sm font-semibold text-white/50">Share this article:</h3>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={copyLink}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm group"
                                    >
                                        {copied ? (
                                            <><Check className="w-4 h-4 text-green-400" /> Copied!</>
                                        ) : (
                                            <><Link2 className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Copy Link</>
                                        )}
                                    </button>

                                    {typeof navigator !== "undefined" && (navigator as any).share ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await (navigator as any).share({
                                                        title: article!.title,
                                                        url: window.location.href
                                                    });
                                                } catch (err) {
                                                    if ((err as Error).name !== "AbortError") {
                                                        console.error("Error sharing:", err);
                                                    }
                                                }
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm group"
                                        >
                                            <Share2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" /> Share
                                        </button>
                                    ) : null}

                                    <div className="flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10">
                                        <a
                                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(article!.title)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-white/40 hover:text-[#1DA1F2] transition-colors hover:bg-white/5 rounded-full"
                                            title="Share on Twitter"
                                        >
                                            <Twitter className="w-4 h-4" />
                                        </a>
                                        <a
                                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-white/40 hover:text-[#0077b5] transition-colors hover:bg-white/5 rounded-full"
                                            title="Share on LinkedIn"
                                        >
                                            <Linkedin className="w-4 h-4" />
                                        </a>
                                        <a
                                            href={`https://wa.me/?text=${encodeURIComponent(`${article!.title} ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-white/40 hover:text-[#25D366] transition-colors hover:bg-white/5 rounded-full"
                                            title="Share on WhatsApp"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-16">
                                <NewsletterSignup 
                                    source="blog_post" 
                                    title="Liked this article?" 
                                    description="Get notified when I publish more deep dives into engineering and system design."
                                />
                            </div>

                            {/* Related articles strip */}
                            {relatedArticles.length > 0 && (
                                <section className="mt-16 pt-16 border-t border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-display)" }}>
                                        Related Articles
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {relatedArticles.map((related) => (
                                            <Link key={related.id} href={`/blog/${related.slug}`}>
                                                <m.div
                                                    whileHover={{ y: -4 }}
                                                    className="group cursor-pointer rounded-2xl overflow-hidden border border-white/5 hover:border-primary/20 transition-all bg-white/[0.02]"
                                                >
                                                    <div className="aspect-video bg-white/5 relative overflow-hidden">
                                                        {related.featuredImage ? (
                                                            <OptimizedImage src={related.featuredImage} alt={`${related.title} - Related article thumbnail`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">📝</div>
                                                        )}
                                                    </div>
                                                    <div className="p-4">
                                                        <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-2 mb-1">
                                                            {related.title}
                                                        </h3>
                                                        <p className="text-xs text-white/40 line-clamp-2">{related.excerpt}</p>
                                                    </div>
                                                </m.div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <footer className="mt-16 pt-16 border-t border-white/10">
                                <div className="bg-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 border border-white/5">
                                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-4xl shrink-0">
                                        {authorName.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div className="text-center md:text-left">
                                        <h3 className="text-xl font-bold text-white mb-2">Written by {authorName}</h3>
                                        <p className="text-white/50 mb-4">
                                            {authorBio}
                                        </p>
                                        <div className="flex justify-center md:justify-start gap-4">
                                            {settings?.socialTwitter && <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">Twitter</a>}
                                            {settings?.socialLinkedin && <a href={settings.socialLinkedin} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">LinkedIn</a>}
                                            {settings?.socialGithub && <a href={settings.socialGithub} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">GitHub</a>}
                                        </div>
                                    </div>
                                </div>
                            </footer>
                        </div>

                        {/* Table of Contents sidebar — visible on xl screens */}
                        <aside className="hidden xl:block w-64 shrink-0">
                            <TableOfContents contentSelector="article" />
                        </aside>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
