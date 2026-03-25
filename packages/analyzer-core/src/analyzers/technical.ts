/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import type { AnalysisResult, AnalysisCategory } from '@seo-analyzer-pro/types';
import {
  type BaseAnalyzer,
  getMetaContent,
  calculatePercentage,
  getSeverityFromScore,
  generateResultId,
} from '../types.js';

/**
 * Technical SEO Analyzer
 * Analyzes robots.txt, viewport, charset, performance indicators
 */
export class TechnicalAnalyzer implements BaseAnalyzer {
  readonly category: AnalysisCategory = 'technical';

  async analyze(input: {
    document: Document;
    url: string;
  }): Promise<AnalysisResult[]> {
    const { document, url } = input;

    return [
      this.analyzeRobotsTxt(document, url),
      this.analyzeViewport(document),
      this.analyzeCharset(document),
      this.analyzePerformance(document),
      this.analyzeMobileFriendliness(document),
      this.analyzeHTTPS(url),
      this.analyzeStructuredData(document),
      this.analyzeHreflang(document),
    ];
  }

  /**
   * Analyze robots.txt (meta robots tag)
   */
  private analyzeRobotsTxt(document: Document, _url: string): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check meta robots tag
    const robotsMeta = getMetaContent(document, 'robots');
    
    if (robotsMeta) {
      details.push(`Meta robots: "${robotsMeta}"`);
      
      const directives = robotsMeta.toLowerCase().split(',').map((d) => d.trim());
      
      if (directives.includes('noindex')) {
        details.push('WARNING: Page is set to noindex');
        recommendations.push('Remove noindex directive if this page should be indexed');
      } else {
        score += 50;
        details.push('Page is indexable');
      }

      if (directives.includes('nofollow')) {
        details.push('Links are set to nofollow');
      }

      if (directives.includes('noarchive')) {
        details.push('Page will not be archived');
      }
    } else {
      score += 50;
      details.push('No robots meta tag (defaults to index, follow)');
    }

    // Check for X-Robots-Tag equivalent in meta
    const googlebot = getMetaContent(document, 'googlebot');
    if (googlebot) {
      details.push(`Googlebot directive: "${googlebot}"`);
    }

    // Check canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      score += 25;
      const canonicalUrl = canonical.getAttribute('href');
      details.push(`Canonical URL set: ${canonicalUrl}`);
    } else {
      recommendations.push('Add a canonical URL to prevent duplicate content issues');
    }

    // Check for sitemap reference
    const sitemapLink = document.querySelector('link[rel="sitemap"], link[type="application/xml"]');
    if (sitemapLink) {
      score += 25;
      details.push('Sitemap reference found');
    }

    return {
      id: generateResultId(this.category, 'Robots & Indexing'),
      name: 'Robots & Indexing',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.2,
      description: 'Analyzes robots directives and indexing settings',
      details,
      recommendations,
    };
  }

  /**
   * Analyze viewport configuration
   */
  private analyzeViewport(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const viewport = getMetaContent(document, 'viewport');

    if (!viewport) {
      details.push('No viewport meta tag found');
      recommendations.push('Add a viewport meta tag for mobile compatibility');
      recommendations.push('Recommended: <meta name="viewport" content="width=device-width, initial-scale=1">');
    } else {
      score += 40;
      details.push(`Viewport: "${viewport}"`);

      // Check for essential directives
      const hasWidth = /width\s*=/.test(viewport);
      const hasInitialScale = /initial-scale\s*=/.test(viewport);

      if (hasWidth) {
        score += 20;
        if (/width\s*=\s*device-width/i.test(viewport)) {
          details.push('Width set to device-width (correct)');
        } else {
          details.push('Width is set to a fixed value');
          recommendations.push('Use width=device-width for responsive design');
        }
      }

      if (hasInitialScale) {
        score += 20;
        details.push('Initial scale is set');
      }

      // Check for problematic directives
      if (/user-scalable\s*=\s*no/i.test(viewport)) {
        details.push('WARNING: user-scalable=no detected');
        recommendations.push('Remove user-scalable=no for accessibility');
      }

      if (/maximum-scale\s*=\s*1(\.0)?$/i.test(viewport)) {
        details.push('WARNING: maximum-scale=1 detected');
        recommendations.push('Remove maximum-scale=1 for accessibility');
      }

      if (score >= 80) {
        score = 100; // Cap at 100 if all good
      }
    }

    return {
      id: generateResultId(this.category, 'Viewport'),
      name: 'Viewport',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.0,
      description: 'Analyzes viewport configuration for mobile',
      details,
      recommendations,
    };
  }

  /**
   * Analyze character encoding
   */
  private analyzeCharset(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for charset in meta tag
    const charsetMeta = document.querySelector('meta[charset]');
    const charsetContent = getMetaContent(document, 'charset');
    const contentType = getMetaContent(document, 'Content-Type');

    let charset: string | null = null;

    if (charsetMeta) {
      charset = charsetMeta.getAttribute('charset');
    } else if (charsetContent) {
      charset = charsetContent;
    } else if (contentType) {
      const match = contentType.match(/charset\s*=\s*([^\s;]+)/i);
      if (match?.[1]) {
        charset = match[1];
      }
    }

    if (!charset) {
      details.push('No charset declaration found');
      recommendations.push('Add charset meta tag: <meta charset="UTF-8">');
    } else {
      score += 50;
      details.push(`Charset: "${charset}"`);

      if (charset.toLowerCase() === 'utf-8') {
        score += 50;
        details.push('UTF-8 encoding (recommended)');
      } else {
        details.push('Consider using UTF-8 for maximum compatibility');
      }
    }

    return {
      id: generateResultId(this.category, 'Character Encoding'),
      name: 'Character Encoding',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.6,
      description: 'Analyzes character encoding declaration',
      details,
      recommendations,
    };
  }

  /**
   * Analyze performance indicators
   */
  private analyzePerformance(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for lazy loading on images
    const images = document.querySelectorAll('img');
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    
    if (images.length > 0) {
      const lazyPercentage = (lazyImages.length / images.length) * 100;
      if (lazyPercentage >= 50) {
        score += 20;
        details.push(`${lazyImages.length}/${images.length} images use lazy loading`);
      } else if (lazyImages.length > 0) {
        score += 10;
        details.push(`Some images use lazy loading`);
        recommendations.push('Add loading="lazy" to images below the fold');
      } else {
        recommendations.push('Add loading="lazy" to images for better performance');
      }
    } else {
      score += 20; // No images, no problem
    }

    // Check for async/defer scripts
    const scripts = document.querySelectorAll('script[src]');
    const asyncScripts = document.querySelectorAll('script[src][async]');
    const deferScripts = document.querySelectorAll('script[src][defer]');

    if (scripts.length > 0) {
      const optimizedScripts = asyncScripts.length + deferScripts.length;
      if (optimizedScripts >= scripts.length * 0.5) {
        score += 20;
        details.push(`${optimizedScripts}/${scripts.length} scripts use async/defer`);
      } else {
        score += 10;
        recommendations.push('Add async or defer to non-critical scripts');
      }
    } else {
      score += 20;
    }

    // Check for preconnect
    const preconnect = document.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]');
    if (preconnect.length > 0) {
      score += 15;
      details.push(`${preconnect.length} preconnect/dns-prefetch hint(s) found`);
    } else {
      recommendations.push('Add preconnect hints for external domains');
    }

    // Check for preload
    const preload = document.querySelectorAll('link[rel="preload"]');
    if (preload.length > 0) {
      score += 15;
      details.push(`${preload.length} preload hint(s) found`);
    }

    // Check for image dimensions
    const imagesWithDimensions = document.querySelectorAll('img[width][height]');
    if (images.length > 0) {
      if (imagesWithDimensions.length === images.length) {
        score += 15;
        details.push('All images have explicit dimensions');
      } else if (imagesWithDimensions.length > 0) {
        score += 8;
        recommendations.push('Add width and height to all images to prevent CLS');
      } else {
        recommendations.push('Add width and height attributes to images');
      }
    } else {
      score += 15;
    }

    // Check for CSS minification indicator (inline styles check)
    const inlineStyles = document.querySelectorAll('style');
    const styleAttributes = document.querySelectorAll('[style]');
    
    if (inlineStyles.length <= 2 && styleAttributes.length <= 10) {
      score += 15;
      details.push('Minimal inline styles');
    } else {
      score += 5;
      details.push('Consider reducing inline styles');
    }

    return {
      id: generateResultId(this.category, 'Performance'),
      name: 'Performance',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.1,
      description: 'Analyzes performance optimization indicators',
      details,
      recommendations,
      rawData: {
        totalImages: images.length,
        lazyImages: lazyImages.length,
        totalScripts: scripts.length,
        asyncScripts: asyncScripts.length,
        deferScripts: deferScripts.length,
        preconnectCount: preconnect.length,
        preloadCount: preload.length,
      },
    };
  }

  /**
   * Analyze mobile friendliness
   */
  private analyzeMobileFriendliness(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check viewport
    const viewport = getMetaContent(document, 'viewport');
    if (viewport && /width\s*=\s*device-width/i.test(viewport)) {
      score += 40;
      details.push('Responsive viewport configured');
    } else {
      recommendations.push('Add viewport meta tag with width=device-width');
    }

    // Check for mobile-friendly CSS patterns
    const styles = document.querySelectorAll('style');
    let hasMediaQueries = false;
    
    styles.forEach((style) => {
      const content = style.textContent ?? '';
      if (/@media/i.test(content)) {
        hasMediaQueries = true;
      }
    });

    if (hasMediaQueries) {
      score += 30;
      details.push('Media queries detected');
    } else {
      recommendations.push('Add responsive CSS with media queries');
    }

    // Check for touch-friendly elements
    const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    // This is a basic check - in reality would need computed styles
    if (buttons.length > 0) {
      score += 15;
      details.push('Interactive elements present');
    }

    // Check for font size (basic check)
    const body = document.body;
    if (body) {
      const bodyStyle = window?.getComputedStyle?.(body);
      if (bodyStyle) {
        const fontSize = bodyStyle.fontSize;
        if (fontSize) {
          const size = parseFloat(fontSize);
          if (size >= 16) {
            score += 15;
            details.push(`Base font size: ${fontSize} (good for mobile)`);
          } else {
            details.push(`Base font size: ${fontSize}`);
            recommendations.push('Consider using at least 16px base font size for mobile');
            score += 8;
          }
        }
      } else {
        score += 15; // Can't check, assume OK
      }
    }

    return {
      id: generateResultId(this.category, 'Mobile Friendliness'),
      name: 'Mobile Friendliness',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.0,
      description: 'Analyzes mobile friendliness indicators',
      details,
      recommendations,
    };
  }

  /**
   * Analyze HTTPS usage
   */
  private analyzeHTTPS(url: string): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const isHTTPS = url.startsWith('https://');

    if (isHTTPS) {
      score = 100;
      details.push('Page is served over HTTPS');
      details.push('Secure connection established');
    } else {
      details.push('Page is NOT served over HTTPS');
      recommendations.push('Migrate to HTTPS for security and SEO benefits');
      recommendations.push('HTTPS is a ranking factor for Google');
    }

    return {
      id: generateResultId(this.category, 'HTTPS'),
      name: 'HTTPS',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.0,
      description: 'Analyzes secure connection usage',
      details,
      recommendations,
    };
  }

  /**
   * Analyze structured data
   */
  private analyzeStructuredData(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const validSchemas: string[] = [];
    const invalidSchemas: string[] = [];

    jsonLdScripts.forEach((script, index) => {
      try {
        const content = script.textContent ?? '';
        const json = JSON.parse(content) as { '@type'?: string; '@context'?: string };
        
        if (json['@type']) {
          validSchemas.push(json['@type']);
        }
      } catch {
        invalidSchemas.push(`Schema ${index + 1}`);
      }
    });

    if (validSchemas.length > 0) {
      score += 50;
      details.push(`Valid JSON-LD schemas: ${validSchemas.join(', ')}`);
    } else {
      recommendations.push('Add JSON-LD structured data to your page');
    }

    if (invalidSchemas.length > 0) {
      details.push(`Invalid JSON-LD: ${invalidSchemas.join(', ')}`);
      recommendations.push('Fix invalid JSON-LD structured data');
    } else if (validSchemas.length > 0) {
      score += 25;
      details.push('All JSON-LD is valid');
    }

    // Check for microdata
    const microdataElements = document.querySelectorAll('[itemscope], [itemtype]');
    if (microdataElements.length > 0) {
      score += 15;
      details.push(`Microdata found: ${microdataElements.length} element(s)`);
    }

    // Check for RDFa
    const rdfaElements = document.querySelectorAll('[typeof], [property], [resource]');
    if (rdfaElements.length > 0) {
      score += 10;
      details.push(`RDFa found: ${rdfaElements.length} element(s)`);
    }

    return {
      id: generateResultId(this.category, 'Structured Data'),
      name: 'Structured Data',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.9,
      description: 'Analyzes structured data implementation',
      details,
      recommendations,
      rawData: {
        jsonLdCount: jsonLdScripts.length,
        validSchemas,
        invalidSchemasCount: invalidSchemas.length,
        microdataCount: microdataElements.length,
        rdfaCount: rdfaElements.length,
      },
    };
  }

  /**
   * Analyze hreflang tags
   */
  private analyzeHreflang(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const hreflangLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    
    if (hreflangLinks.length === 0) {
      // Not necessarily bad if single-language site
      score = 75;
      details.push('No hreflang tags found');
      details.push('This is OK for single-language sites');
    } else {
      score += 50;
      details.push(`${hreflangLinks.length} hreflang tag(s) found`);

      const languages: string[] = [];
      hreflangLinks.forEach((link) => {
        const hreflang = link.getAttribute('hreflang');
        if (hreflang) {
          languages.push(hreflang);
        }
      });

      details.push(`Languages: ${languages.join(', ')}`);

      // Check for x-default
      const hasXDefault = languages.includes('x-default');
      if (hasXDefault) {
        score += 25;
        details.push('x-default hreflang present');
      } else {
        recommendations.push('Consider adding x-default hreflang for international targeting');
      }

      // Check for self-referencing
      score += 25;
      details.push('Hreflang implementation detected');
    }

    return {
      id: generateResultId(this.category, 'Hreflang'),
      name: 'Hreflang',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.7,
      description: 'Analyzes hreflang implementation for international SEO',
      details,
      recommendations,
      rawData: {
        hreflangCount: hreflangLinks.length,
        languages: Array.from(hreflangLinks).map((l) => l.getAttribute('hreflang')).filter(Boolean),
      },
    };
  }
}
