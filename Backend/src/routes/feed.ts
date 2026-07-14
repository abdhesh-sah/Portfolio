import { Router, Request, Response } from "express";
import { articleService } from "../services/article.service.js";
import { settingsService } from "../services/settings.service.js";
import type { Article } from "@portfolio/shared";
import { escapeXml } from "../lib/xml-utils.js";
import { logger } from "../lib/logger.js";

const feedRoutes = Router();

feedRoutes.get("/feed.xml", async (req: Request, res: Response): Promise<void> => {
  try {
    const [articles, settings] = await Promise.all([
      articleService.getAll("published"),
      settingsService.getSettings()
    ]);
    
    const siteUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL;
    if (!siteUrl) {
      logger.error({ context: "feed" }, "FRONTEND_URL / PUBLIC_URL not set — cannot generate feed");
      res.status(500).json({ error: "Feed URL not configured" });
      return;
    }

    const ownerName = settings?.personalName || "Portfolio Owner";

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(ownerName)} - Portfolio &amp; Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Latest articles and projects from ${escapeXml(ownerName)}.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/api/v1/feed/feed.xml" rel="self" type="application/rss+xml" />
`;

    articles.forEach((article: Article) => {
      const url = escapeXml(`${siteUrl}/blog/${article.slug}`);
      const date = article.publishedAt ? new Date(article.publishedAt).toUTCString() : new Date(article.createdAt).toUTCString();

      xml += `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${article.excerpt || article.title}]]></description>
      <pubDate>${date}</pubDate>
    </item>`;
    });

    xml += `
  </channel>
</rss>`;

    res.header("Content-Type", "application/rss+xml");
    res.send(xml);
  } catch (error) {
    logger.error({ context: "feed", error }, "Error generating RSS feed");
    res.status(500).send("Error generating feed");
  }
});

export default feedRoutes;
