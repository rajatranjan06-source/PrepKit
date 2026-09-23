import * as cheerio from 'cheerio';
const robotsParser = require('robots-parser');
import axios from 'axios';
import { validateUrlForSSRF } from '../lib/ssrf';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
  error?: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  failedUrls: string[];
  robotsTxt: string | null;
  publicDiscussion?: string[];
}

const MAX_PAGES = 15;
const MAX_CONTENT_LENGTH = 50000;
const REQUEST_TIMEOUT = 10000;
const CONCURRENCY = 3;

const RELEVANT_KEYWORDS = [
  'careers', 'jobs', 'hiring', 'handbook', 'engineering', 
  'culture', 'about', 'interview', 'team', 'values', 'mission',
  'blog', 'news', 'press', 'leadership', 'founders', 'process', 'tech'
];

function isRelevantUrl(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);
    if (urlObj.hostname !== baseObj.hostname) return false;
    
    const skipPatterns = [
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg|pkg|iso|img)(\?.*)?$/i,
      /\/(login|signup|signin|register|auth|account|cart|checkout|payment)/i,
      /\/(privacy|terms|legal|cookie|gdpr|privacy-policy|terms-of-service)/i,
      /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|map|woff|woff2|ttf|eot)(\?.*)?$/i,
    ];
    if (skipPatterns.some(p => p.test(url))) return false;
    
    const p = urlObj.pathname.toLowerCase();
    return RELEVANT_KEYWORDS.some(keyword => p.includes(keyword));
  } catch {
    return false;
  }
}

function rankUrlRelevance(url: string, baseUrl: string): number {
  try {
    const urlObj = new URL(url);
    const p = urlObj.pathname.toLowerCase();
    let score = 0;
    if (p === '/' || p === '') score += 100;
    for (const keyword of RELEVANT_KEYWORDS) {
      if (p.includes(keyword)) {
        score += 50;
        if (p === '/' + keyword || p === '/' + keyword + '/') score += 30;
      }
    }
    score += Math.max(0, 20 - p.split('/').length * 2);
    return score;
  } catch {
    return 0;
  }
}

export async function crawlWebsite(baseUrl: string): Promise<CrawlResult> {
  console.log("crawlWebsite called with:", baseUrl);
  const ssrfCheck = validateUrlForSSRF(baseUrl);
  if (!ssrfCheck.valid) {
    return {
      pages: [],
      failedUrls: [`${baseUrl} (${ssrfCheck.reason})`],
      robotsTxt: null,
      publicDiscussion: []
    };
  }

  const visited = new Set<string>();
  const toVisit: string[] = [baseUrl];
  const pages: CrawledPage[] = [];
  const failedUrls: string[] = [];
  let robotsTxt: string | null = null;
  let robotsUrl = '';

  try {
    robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const ssrfRobots = validateUrlForSSRF(robotsUrl);
    if (ssrfRobots.valid) {
      console.log("Fetching robots.txt:", robotsUrl);
      const robotsResponse = await axios.get(robotsUrl, { timeout: REQUEST_TIMEOUT });
      robotsTxt = robotsResponse.data;
    }
  } catch (err) {
    console.error("Robots.txt fetch error:", err);
    // Ignore robots.txt fetch failures
  }

  const robots = robotsTxt ? robotsParser(robotsUrl, robotsTxt) : null;

  while (toVisit.length > 0 && pages.length < MAX_PAGES) {
    const batch = toVisit.splice(0, CONCURRENCY);
    
    await Promise.all(batch.map(async (url) => {
      if (visited.has(url)) return;
      visited.add(url);

      const ssrfUrl = validateUrlForSSRF(url);
      if (!ssrfUrl.valid) {
        failedUrls.push(`${url} (${ssrfUrl.reason})`);
        return;
      }

      if (robots && !robots.isAllowed(url, 'PrepKitBot')) {
        failedUrls.push(`${url} (blocked by robots.txt)`);
        return;
      }

      try {
        const response = await axios.get(url, {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'User-Agent': 'PrepKitBot/1.0 (Interview Prep Assistant)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          maxContentLength: MAX_CONTENT_LENGTH,
          validateStatus: (status) => status < 400,
        });

        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
          failedUrls.push(`${url} (non-HTML content: ${contentType})`);
          return;
        }

        const $ = cheerio.load(response.data);
        $('script, style, nav, footer, header, aside, .ad, .ads, .advertisement, [class*="cookie"], [id*="cookie"], [class*="banner"], [id*="banner"]').remove();
        
        const title = $('title').text().trim() || $('h1').first().text().trim() || url;
        const mainContent = $('main, article, [role="main"], .content, .main-content, #content, #main').first();
        const textContent = (mainContent.length ? mainContent : $('body')).text().replace(/\s+/g, ' ').trim().substring(0, MAX_CONTENT_LENGTH);

        const links: string[] = [];
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, url).toString();
              if (!visited.has(absoluteUrl) && isRelevantUrl(absoluteUrl, baseUrl)) {
                links.push(absoluteUrl);
              }
            } catch {
              // Ignore invalid link URLs
            }
          }
        });

        pages.push({ url, title, content: textContent, links });

        const rankedLinks = links
          .map(link => ({ url: link, score: rankUrlRelevance(link, baseUrl) }))
          .sort((a, b) => b.score - a.score)
          .map(item => item.url);

        for (const rLink of rankedLinks) {
          if (!toVisit.includes(rLink) && !visited.has(rLink)) {
            toVisit.push(rLink);
          }
        }
      } catch (error) {
        console.error(`Crawler error for ${url}:`, error); failedUrls.push(`${url} (${error instanceof Error ? error.message : 'Unknown network error'})`);
      }
    }));
  }

  // Search public interview discussion references (simulated/recorded)
  const publicDiscussion: string[] = [];
  try {
    const domainName = new URL(baseUrl).hostname.replace(/^www\./, '');
    publicDiscussion.push(`Glassdoor interview reviews for ${domainName}`);
    publicDiscussion.push(`Reddit r/cscareerquestions discussions for ${domainName}`);
    publicDiscussion.push(`Blind company reviews & interview process for ${domainName}`);
  } catch {
    // ignore
  }

  return { pages, failedUrls, robotsTxt, publicDiscussion };
}

export function extractTextFromPages(pages: CrawledPage[]): string {
  if (pages.length === 0) return 'No pages successfully crawled.';
  return pages.map(p => `--- Page: ${p.url} ---\nTitle: ${p.title}\nContent: ${p.content}\n`).join('\n\n');
}
