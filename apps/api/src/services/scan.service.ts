/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { cache } from '../lib/redis.js';

// Types
export interface ScanResult {
  scores: {
    overall: number;
    seo: number;
    performance: number;
    accessibility: number;
    bestPractices: number;
    geo: number;
  };
  metrics: {
    pageLoadTime: number;
    pageSize: number;
    requestCount: number;
    domSize: number;
    https: boolean;
    mobile: boolean;
    structuredData: boolean;
    metaTags: {
      title: boolean;
      description: boolean;
      keywords: boolean;
      ogTags: boolean;
      twitterCards: boolean;
    };
    headings: {
      h1: number;
      h2: number;
      h3: number;
    };
    images: {
      total: number;
      withAlt: number;
      optimized: number;
    };
    links: {
      internal: number;
      external: number;
      broken: number;
    };
  };
  actionItems: Array<{
    id: string;
    category: 'critical' | 'important' | 'opportunity' | 'suggestion';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    details?: Record<string, unknown>;
  }>;
}

export interface ScanOptions {
  url: string;
  crawlDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
  userAgent?: string;
  timeout?: number;
}

/**
 * Scan Service - Handles SEO analysis operations
 */
export class ScanService {
  /**
   * Run a comprehensive SEO scan
   */
  async runScan(scanId: string, options: ScanOptions): Promise<ScanResult> {
    const startTime = Date.now();

    try {
      // Update scan status to running
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      logger.info({ scanId, url: options.url }, 'Starting SEO scan');

      // Run all scan components in parallel
      const [seoAnalysis, performanceAnalysis, accessibilityAnalysis, geoAnalysis] = await Promise.all([
        this.analyzeSEO(options),
        this.analyzePerformance(options),
        this.analyzeAccessibility(options),
        this.analyzeGEO(options),
      ]);

      // Calculate overall score
      const scores = {
        overall: Math.round(
          (seoAnalysis.score * 0.35 +
            performanceAnalysis.score * 0.25 +
            accessibilityAnalysis.score * 0.15 +
            geoAnalysis.score * 0.25)
        ),
        seo: seoAnalysis.score,
        performance: performanceAnalysis.score,
        accessibility: accessibilityAnalysis.score,
        bestPractices: seoAnalysis.bestPracticesScore,
        geo: geoAnalysis.score,
      };

      // Combine metrics
      const metrics = {
        ...seoAnalysis.metrics,
        ...performanceAnalysis.metrics,
        ...accessibilityAnalysis.metrics,
        ...geoAnalysis.metrics,
      };

      // Combine and prioritize action items
      const actionItems = this.prioritizeActionItems([
        ...seoAnalysis.actionItems,
        ...performanceAnalysis.actionItems,
        ...accessibilityAnalysis.actionItems,
        ...geoAnalysis.actionItems,
      ]);

      const result: ScanResult = {
        scores,
        metrics,
        actionItems,
      };

      // Update scan with results
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          scores,
          metrics,
          actionItems,
        },
      });

      const duration = Date.now() - startTime;
      logger.info({ scanId, duration, overallScore: scores.overall }, 'SEO scan completed');

      // Cache the result
      await cache.set(`scan:${scanId}`, result, 3600); // 1 hour

      return result;
    } catch (error) {
      const err = error as Error;

      // Update scan status to failed
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
        },
      });

      logger.error({ scanId, error: err.message }, 'SEO scan failed');
      throw error;
    }
  }

  /**
   * Analyze SEO factors
   */
  private async analyzeSEO(options: ScanOptions): Promise<{
    score: number;
    bestPracticesScore: number;
    metrics: Record<string, unknown>;
    actionItems: ScanResult['actionItems'];
  }> {
    // In production, this would make actual HTTP requests and analyze the page
    // For now, return simulated analysis
    const actionItems: ScanResult['actionItems'] = [];

    // Simulate SEO analysis
    const metaTagsScore = 85;
    const headingsScore = 75;
    const imagesScore = 70;
    const linksScore = 90;
    const structuredDataScore = 60;

    const score = Math.round(
      (metaTagsScore * 0.25 +
        headingsScore * 0.2 +
        imagesScore * 0.2 +
        linksScore * 0.15 +
        structuredDataScore * 0.2)
    );

    // Generate action items based on scores
    if (metaTagsScore < 80) {
      actionItems.push({
        id: 'seo-meta-1',
        category: 'important',
        title: 'Improve meta tags',
        description: 'Some pages are missing important meta tags like description or keywords.',
        impact: 'high',
        effort: 'low',
      });
    }

    if (headingsScore < 80) {
      actionItems.push({
        id: 'seo-headings-1',
        category: 'important',
        title: 'Optimize heading structure',
        description: 'Improve the H1-H6 heading hierarchy for better content structure.',
        impact: 'medium',
        effort: 'low',
      });
    }

    if (imagesScore < 80) {
      actionItems.push({
        id: 'seo-images-1',
        category: 'opportunity',
        title: 'Add alt text to images',
        description: 'Some images are missing alt text which helps with SEO and accessibility.',
        impact: 'medium',
        effort: 'low',
      });
    }

    if (structuredDataScore < 70) {
      actionItems.push({
        id: 'seo-schema-1',
        category: 'opportunity',
        title: 'Implement structured data',
        description: 'Add Schema.org markup to help search engines understand your content.',
        impact: 'high',
        effort: 'medium',
      });
    }

    return {
      score,
      bestPracticesScore: Math.round((metaTagsScore + linksScore) / 2),
      metrics: {
        metaTags: {
          title: true,
          description: true,
          keywords: false,
          ogTags: true,
          twitterCards: false,
        },
        headings: {
          h1: 1,
          h2: 8,
          h3: 15,
        },
        images: {
          total: 24,
          withAlt: 18,
          optimized: 20,
        },
        links: {
          internal: 45,
          external: 12,
          broken: 0,
        },
      },
      actionItems,
    };
  }

  /**
   * Analyze performance factors
   */
  private async analyzePerformance(options: ScanOptions): Promise<{
    score: number;
    metrics: Record<string, unknown>;
    actionItems: ScanResult['actionItems'];
  }> {
    const actionItems: ScanResult['actionItems'] = [];

    // Simulate performance analysis
    const pageLoadTime = 2.5; // seconds
    const pageSize = 1500; // KB
    const requestCount = 45;

    const loadTimeScore = pageLoadTime < 3 ? 80 : pageLoadTime < 5 ? 60 : 40;
    const sizeScore = pageSize < 1000 ? 90 : pageSize < 2000 ? 70 : 50;
    const requestScore = requestCount < 30 ? 90 : requestCount < 50 ? 70 : 50;

    const score = Math.round((loadTimeScore * 0.4 + sizeScore * 0.3 + requestScore * 0.3));

    if (pageLoadTime > 3) {
      actionItems.push({
        id: 'perf-speed-1',
        category: 'critical',
        title: 'Improve page load time',
        description: `Page loads in ${pageLoadTime}s. Target is under 3 seconds for optimal user experience.`,
        impact: 'high',
        effort: 'medium',
        details: { currentPageLoadTime: pageLoadTime },
      });
    }

    if (pageSize > 1500) {
      actionItems.push({
        id: 'perf-size-1',
        category: 'important',
        title: 'Reduce page size',
        description: `Page size is ${(pageSize / 1024).toFixed(1)}MB. Consider optimizing images and minifying assets.`,
        impact: 'medium',
        effort: 'medium',
        details: { currentPageSize: pageSize },
      });
    }

    if (requestCount > 40) {
      actionItems.push({
        id: 'perf-requests-1',
        category: 'opportunity',
        title: 'Reduce HTTP requests',
        description: `${requestCount} requests made. Consider bundling assets or using HTTP/2.`,
        impact: 'medium',
        effort: 'medium',
        details: { currentRequestCount: requestCount },
      });
    }

    return {
      score,
      metrics: {
        pageLoadTime,
        pageSize,
        requestCount,
        domSize: 1250,
        https: true,
        mobile: true,
      },
      actionItems,
    };
  }

  /**
   * Analyze accessibility factors
   */
  private async analyzeAccessibility(options: ScanOptions): Promise<{
    score: number;
    metrics: Record<string, unknown>;
    actionItems: ScanResult['actionItems'];
  }> {
    const actionItems: ScanResult['actionItems'] = [];

    // Simulate accessibility analysis
    const ariaScore = 75;
    const colorContrastScore = 85;
    const keyboardNavScore = 90;
    const formsScore = 70;

    const score = Math.round(
      (ariaScore * 0.3 + colorContrastScore * 0.25 + keyboardNavScore * 0.25 + formsScore * 0.2)
    );

    if (ariaScore < 80) {
      actionItems.push({
        id: 'a11y-aria-1',
        category: 'important',
        title: 'Improve ARIA attributes',
        description: 'Some interactive elements are missing proper ARIA labels and roles.',
        impact: 'medium',
        effort: 'medium',
      });
    }

    if (formsScore < 80) {
      actionItems.push({
        id: 'a11y-forms-1',
        category: 'important',
        title: 'Improve form accessibility',
        description: 'Some form fields are missing labels or have poor error messaging.',
        impact: 'medium',
        effort: 'low',
      });
    }

    return {
      score,
      metrics: {
        ariaLabels: 85,
        colorContrast: 90,
        keyboardNavigation: true,
        formLabels: 75,
      },
      actionItems,
    };
  }

  /**
   * Analyze GEO (Generative Engine Optimization) factors
   */
  private async analyzeGEO(options: ScanOptions): Promise<{
    score: number;
    metrics: Record<string, unknown>;
    actionItems: ScanResult['actionItems'];
  }> {
    const actionItems: ScanResult['actionItems'] = [];

    // Simulate GEO analysis
    const contentClarityScore = 80;
    const structuredContentScore = 65;
    const faqScore = 50;
    const authorCredentialsScore = 70;

    const score = Math.round(
      (contentClarityScore * 0.3 +
        structuredContentScore * 0.3 +
        faqScore * 0.2 +
        authorCredentialsScore * 0.2)
    );

    if (structuredContentScore < 75) {
      actionItems.push({
        id: 'geo-structure-1',
        category: 'important',
        title: 'Add structured content markup',
        description: 'Implement Schema.org structured data to help AI engines understand your content.',
        impact: 'high',
        effort: 'medium',
      });
    }

    if (faqScore < 70) {
      actionItems.push({
        id: 'geo-faq-1',
        category: 'opportunity',
        title: 'Add FAQ sections',
        description: 'Include FAQ sections with clear Q&A format to improve AI answer extraction.',
        impact: 'high',
        effort: 'low',
      });
    }

    if (authorCredentialsScore < 80) {
      actionItems.push({
        id: 'geo-author-1',
        category: 'suggestion',
        title: 'Add author credentials',
        description: 'Include author information and credentials to establish E-E-A-T signals.',
        impact: 'medium',
        effort: 'low',
      });
    }

    return {
      score,
      metrics: {
        contentClarity: contentClarityScore,
        structuredContent: structuredContentScore,
        faqPresent: faqScore > 50,
        authorInfo: authorCredentialsScore > 60,
        readabilityScore: 72,
      },
      actionItems,
    };
  }

  /**
   * Prioritize action items by impact and effort
   */
  private prioritizeActionItems(items: ScanResult['actionItems']): ScanResult['actionItems'] {
    const categoryPriority = { critical: 0, important: 1, opportunity: 2, suggestion: 3 };
    const impactPriority = { high: 0, medium: 1, low: 2 };
    const effortPriority = { low: 0, medium: 1, high: 2 };

    return items.sort((a, b) => {
      // Sort by category first
      const categoryDiff = categoryPriority[a.category] - categoryPriority[b.category];
      if (categoryDiff !== 0) return categoryDiff;

      // Then by impact (high first)
      const impactDiff = impactPriority[a.impact] - impactPriority[b.impact];
      if (impactDiff !== 0) return impactDiff;

      // Then by effort (low first)
      return effortPriority[a.effort] - effortPriority[b.effort];
    });
  }

  /**
   * Get scan result from cache or database
   */
  async getScanResult(scanId: string): Promise<ScanResult | null> {
    // Try cache first
    const cached = await cache.get<ScanResult>(`scan:${scanId}`);
    if (cached) return cached;

    // Get from database
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        scores: true,
        metrics: true,
        actionItems: true,
      },
    });

    if (!scan || scan.status !== 'COMPLETED') return null;

    const result: ScanResult = {
      scores: scan.scores as ScanResult['scores'],
      metrics: scan.metrics as ScanResult['metrics'],
      actionItems: scan.actionItems as ScanResult['actionItems'],
    };

    // Cache for future requests
    await cache.set(`scan:${scanId}`, result, 3600);

    return result;
  }

  /**
   * Compare multiple scans
   */
  async compareScans(scanIds: string[]): Promise<{
    scans: Array<{ id: string; scores: ScanResult['scores']; date: Date }>;
    trends: Record<string, { direction: 'up' | 'down' | 'stable'; change: number }>;
  }> {
    const scans = await prisma.scan.findMany({
      where: { id: { in: scanIds } },
      select: {
        id: true,
        scores: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (scans.length < 2) {
      return { scans: [], trends: {} };
    }

    const formattedScans = scans.map((scan) => ({
      id: scan.id,
      scores: scan.scores as ScanResult['scores'],
      date: scan.createdAt,
    }));

    // Calculate trends
    const first = formattedScans[0];
    const last = formattedScans[formattedScans.length - 1];

    const trends: Record<string, { direction: 'up' | 'down' | 'stable'; change: number }> = {};

    for (const key of Object.keys(first.scores)) {
      const change = last.scores[key as keyof typeof last.scores] - first.scores[key as keyof typeof first.scores];
      trends[key] = {
        direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
        change,
      };
    }

    return { scans: formattedScans, trends };
  }
}

export const scanService = new ScanService();
