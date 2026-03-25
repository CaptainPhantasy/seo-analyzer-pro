/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import type { AnalysisResult, AnalysisCategory } from '@seo-analyzer-pro/types';
import {
  type BaseAnalyzer,
  extractTextContent,
  getMetaContent,
  isOptimalLength,
  calculatePercentage,
  getSeverityFromScore,
  generateResultId,
} from '../types.js';

/**
 * On-Page SEO Analyzer
 * Analyzes title, meta description, headings, images, links, and Open Graph
 */
export class OnPageAnalyzer implements BaseAnalyzer {
  readonly category: AnalysisCategory = 'onpage';

  async analyze(input: {
    document: Document;
    url: string;
  }): Promise<AnalysisResult[]> {
    const { document, url } = input;

    return [
      this.analyzeTitle(document),
      this.analyzeMetaDescription(document),
      this.analyzeHeadings(document),
      this.analyzeImages(document),
      this.analyzeLinks(document, url),
      this.analyzeOpenGraph(document),
      this.analyzeTwitterCard(document),
      this.analyzeCanonical(document, url),
      this.analyzeLanguage(document),
      this.analyzeKeywordPresence(document),
    ];
  }

  /**
   * Analyze title tag
   */
  private analyzeTitle(document: Document): AnalysisResult {
    const titleElement = document.querySelector('title');
    const title = extractTextContent(titleElement);
    const length = title.length;
    const optimalLength = isOptimalLength(title, 30, 60);

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    if (!titleElement || !title) {
      details.push('No title tag found');
      recommendations.push('Add a descriptive title tag to your page');
    } else {
      score += 30;
      details.push(`Title: "${title}"`);
      details.push(`Length: ${length} characters`);

      if (optimalLength) {
        score += 30;
        details.push('Length is optimal (30-60 characters)');
      } else if (length < 30) {
        details.push('Title is too short');
        recommendations.push('Expand your title to 30-60 characters for better visibility');
      } else {
        details.push('Title is too long');
        recommendations.push('Shorten your title to 30-60 characters to prevent truncation');
      }

      // Check for keyword presence (basic check)
      const bodyText = document.body?.textContent?.toLowerCase() ?? '';
      const titleWords = title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const keywordMatches = titleWords.filter((word) => bodyText.includes(word));
      
      if (keywordMatches.length > 0) {
        score += 40;
        details.push(`Keywords found in content: ${keywordMatches.join(', ')}`);
      } else {
        recommendations.push('Include relevant keywords that appear in your content');
      }
    }

    return {
      id: generateResultId(this.category, 'Title Tag'),
      name: 'Title Tag',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.5,
      description: 'Analyzes the page title for SEO best practices',
      details,
      recommendations,
    };
  }

  /**
   * Analyze meta description
   */
  private analyzeMetaDescription(document: Document): AnalysisResult {
    const description = getMetaContent(document, 'description') ?? '';
    const length = description.length;
    const optimalLength = isOptimalLength(description, 120, 160);

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    if (!description) {
      details.push('No meta description found');
      recommendations.push('Add a compelling meta description (120-160 characters)');
    } else {
      score += 40;
      details.push(`Description: "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"`);
      details.push(`Length: ${length} characters`);

      if (optimalLength) {
        score += 30;
        details.push('Length is optimal (120-160 characters)');
      } else if (length < 120) {
        details.push('Description is too short');
        recommendations.push('Expand your meta description to 120-160 characters');
      } else {
        score += 15;
        details.push('Description is too long and may be truncated');
        recommendations.push('Shorten your meta description to 120-160 characters');
      }

      // Check for compelling words
      const compellingWords = ['discover', 'learn', 'find', 'get', 'best', 'top', 'guide', 'how to'];
      const hasCompelling = compellingWords.some((word) => description.toLowerCase().includes(word));
      
      if (hasCompelling) {
        score += 30;
        details.push('Contains compelling language');
      } else {
        recommendations.push('Add compelling language to improve click-through rates');
      }
    }

    return {
      id: generateResultId(this.category, 'Meta Description'),
      name: 'Meta Description',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.2,
      description: 'Analyzes meta description for SEO and click-through optimization',
      details,
      recommendations,
    };
  }

  /**
   * Analyze heading structure
   */
  private analyzeHeadings(document: Document): AnalysisResult {
    const h1s = Array.from(document.querySelectorAll('h1'));
    const h2s = Array.from(document.querySelectorAll('h2'));
    const h3s = Array.from(document.querySelectorAll('h3'));
    const h4s = Array.from(document.querySelectorAll('h4'));
    const h5s = Array.from(document.querySelectorAll('h5'));
    const h6s = Array.from(document.querySelectorAll('h6'));

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // H1 analysis
    if (h1s.length === 0) {
      details.push('No H1 tag found');
      recommendations.push('Add a single H1 tag that describes your main topic');
    } else if (h1s.length === 1 && h1s[0]) {
      score += 40;
      const h1Text = extractTextContent(h1s[0]);
      details.push(`H1: "${h1Text}"`);
    } else {
      details.push(`Multiple H1 tags found: ${h1s.length}`);
      recommendations.push('Use only one H1 tag per page');
    }

    // Heading hierarchy
    const hasH2 = h2s.length > 0;
    const hasH3 = h3s.length > 0;

    details.push(`H2 tags: ${h2s.length}`);
    details.push(`H3 tags: ${h3s.length}`);
    details.push(`H4 tags: ${h4s.length}`);
    details.push(`H5 tags: ${h5s.length}`);
    details.push(`H6 tags: ${h6s.length}`);

    if (hasH2) {
      score += 20;
    } else if (h1s.length > 0) {
      recommendations.push('Add H2 tags to structure your content');
    }

    // Check for skipped levels
    if (h1s.length > 0 && !hasH2 && hasH3) {
      details.push('Heading hierarchy issue: H3 used without H2');
      recommendations.push('Maintain proper heading hierarchy (H1 → H2 → H3)');
    } else if (hasH2 && !hasH3 && h4s.length > 0) {
      details.push('Heading hierarchy issue: H4 used without H3');
    } else {
      score += 20;
      details.push('Heading hierarchy is properly structured');
    }

    // Content structure score
    const totalHeadings = h1s.length + h2s.length + h3s.length + h4s.length + h5s.length + h6s.length;
    if (totalHeadings >= 3 && totalHeadings <= 10) {
      score += 20;
    } else if (totalHeadings > 10) {
      score += 10;
    }

    return {
      id: generateResultId(this.category, 'Heading Structure'),
      name: 'Heading Structure',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.3,
      description: 'Analyzes heading hierarchy and structure',
      details,
      recommendations,
      rawData: {
        h1Count: h1s.length,
        h2Count: h2s.length,
        h3Count: h3s.length,
        h4Count: h4s.length,
        h5Count: h5s.length,
        h6Count: h6s.length,
      },
    };
  }

  /**
   * Analyze images
   */
  private analyzeImages(document: Document): AnalysisResult {
    const images = Array.from(document.querySelectorAll('img'));
    const totalImages = images.length;

    if (totalImages === 0) {
      return {
        id: generateResultId(this.category, 'Image Optimization'),
        name: 'Image Optimization',
        category: this.category,
        severity: 'info',
        score: 100,
        maxScore: 100,
        weight: 1.0,
        description: 'Analyzes image alt text and optimization',
        details: ['No images found on this page'],
        recommendations: [],
      };
    }

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const withAlt = images.filter((img) => {
      const alt = img.getAttribute('alt');
      return alt !== null && alt.trim().length > 0;
    }).length;

    const withoutAlt = totalImages - withAlt;
    const altPercentage = calculatePercentage(withAlt, totalImages);

    details.push(`Total images: ${totalImages}`);
    details.push(`Images with alt text: ${withAlt}`);
    details.push(`Images without alt text: ${withoutAlt}`);

    // Score based on alt text coverage
    score = Math.round(altPercentage * 0.7);

    if (withoutAlt > 0) {
      recommendations.push(`Add descriptive alt text to ${withoutAlt} image(s)`);
    }

    // Check for lazy loading
    const withLazyLoading = images.filter(
      (img) => img.getAttribute('loading') === 'lazy'
    ).length;
    
    if (withLazyLoading > 0) {
      score += 15;
      details.push(`${withLazyLoading} image(s) use lazy loading`);
    } else if (totalImages > 2) {
      recommendations.push('Consider adding lazy loading to images below the fold');
    }

    // Check for width/height attributes
    const withDimensions = images.filter(
      (img) => img.hasAttribute('width') && img.hasAttribute('height')
    ).length;
    
    if (withDimensions === totalImages) {
      score += 15;
      details.push('All images have explicit dimensions');
    } else if (withDimensions > 0) {
      score += 7;
      details.push(`${withDimensions}/${totalImages} images have explicit dimensions`);
      recommendations.push('Add width and height attributes to prevent layout shift');
    }

    return {
      id: generateResultId(this.category, 'Image Optimization'),
      name: 'Image Optimization',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.0,
      description: 'Analyzes image alt text and optimization',
      details,
      recommendations,
      rawData: {
        totalImages,
        withAlt,
        withoutAlt,
        withLazyLoading,
        withDimensions,
      },
    };
  }

  /**
   * Analyze links
   */
  private analyzeLinks(document: Document, baseUrl: string): AnalysisResult {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const totalLinks = links.length;

    if (totalLinks === 0) {
      return {
        id: generateResultId(this.category, 'Link Analysis'),
        name: 'Link Analysis',
        category: this.category,
        severity: 'warning',
        score: 50,
        maxScore: 100,
        weight: 1.0,
        description: 'Analyzes internal and external links',
        details: ['No links found on this page'],
        recommendations: ['Add relevant internal and external links to improve navigation and authority'],
      };
    }

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const baseHostname = new URL(baseUrl).hostname;

    const internalLinks = links.filter((link) => {
      const href = link.getAttribute('href') ?? '';
      try {
        if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) {
          return true;
        }
        const linkUrl = new URL(href, baseUrl);
        return linkUrl.hostname === baseHostname;
      } catch {
        return false;
      }
    }).length;

    const externalLinks = totalLinks - internalLinks;
    const nofollowLinks = links.filter(
      (link) => link.getAttribute('rel')?.includes('nofollow')
    ).length;

    details.push(`Total links: ${totalLinks}`);
    details.push(`Internal links: ${internalLinks}`);
    details.push(`External links: ${externalLinks}`);
    details.push(`Nofollow links: ${nofollowLinks}`);

    // Score based on link balance
    if (internalLinks >= 2 && internalLinks <= 100) {
      score += 40;
    } else if (internalLinks > 0) {
      score += 20;
    } else {
      recommendations.push('Add internal links to improve site navigation');
    }

    if (externalLinks > 0 && externalLinks <= 20) {
      score += 30;
      details.push('Good balance of external links');
    } else if (externalLinks > 20) {
      score += 15;
      recommendations.push('Consider reducing the number of external links');
    }

    // Check for descriptive anchor text
    const emptyAnchors = links.filter((link) => {
      const text = extractTextContent(link).trim();
      const hasImg = link.querySelector('img') !== null;
      return text.length === 0 && !hasImg;
    }).length;

    if (emptyAnchors === 0) {
      score += 30;
      details.push('All links have descriptive anchor text');
    } else {
      score += 15;
      details.push(`${emptyAnchors} link(s) have empty anchor text`);
      recommendations.push('Add descriptive text to link anchors');
    }

    return {
      id: generateResultId(this.category, 'Link Analysis'),
      name: 'Link Analysis',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.0,
      description: 'Analyzes internal and external links',
      details,
      recommendations,
      rawData: {
        totalLinks,
        internalLinks,
        externalLinks,
        nofollowLinks,
        emptyAnchors,
      },
    };
  }

  /**
   * Analyze Open Graph tags
   */
  private analyzeOpenGraph(document: Document): AnalysisResult {
    const ogTitle = getMetaContent(document, 'og:title');
    const ogDescription = getMetaContent(document, 'og:description');
    const ogImage = getMetaContent(document, 'og:image');
    const ogUrl = getMetaContent(document, 'og:url');
    const ogType = getMetaContent(document, 'og:type');

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const tags = {
      'og:title': ogTitle,
      'og:description': ogDescription,
      'og:image': ogImage,
      'og:url': ogUrl,
      'og:type': ogType,
    };

    const presentTags = Object.entries(tags).filter(([, value]) => value !== null);
    const missingTags = Object.entries(tags).filter(([, value]) => value === null);

    details.push(`Open Graph tags present: ${presentTags.length}/5`);

    presentTags.forEach(([key, value]) => {
      details.push(`${key}: "${value?.substring(0, 50)}${value && value.length > 50 ? '...' : ''}"`);
      score += 20;
    });

    if (missingTags.length > 0) {
      recommendations.push(
        `Add missing Open Graph tags: ${missingTags.map(([key]) => key).join(', ')}`
      );
    }

    const isComplete = missingTags.length === 0;
    if (isComplete) {
      details.push('Open Graph implementation is complete');
    }

    return {
      id: generateResultId(this.category, 'Open Graph'),
      name: 'Open Graph',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.8,
      description: 'Analyzes Open Graph meta tags for social sharing',
      details,
      recommendations,
      rawData: {
        hasTitle: !!ogTitle,
        hasDescription: !!ogDescription,
        hasImage: !!ogImage,
        hasUrl: !!ogUrl,
        hasType: !!ogType,
        complete: isComplete,
      },
    };
  }

  /**
   * Analyze Twitter Card tags
   */
  private analyzeTwitterCard(document: Document): AnalysisResult {
    const twitterCard = getMetaContent(document, 'twitter:card');
    const twitterTitle = getMetaContent(document, 'twitter:title');
    const twitterDescription = getMetaContent(document, 'twitter:description');
    const twitterImage = getMetaContent(document, 'twitter:image');

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    if (twitterCard) {
      score += 25;
      details.push(`Twitter card type: ${twitterCard}`);
    } else {
      recommendations.push('Add twitter:card meta tag (summary, summary_large_image, etc.)');
    }

    if (twitterTitle) {
      score += 25;
      details.push('Twitter title is set');
    } else {
      recommendations.push('Add twitter:title meta tag');
    }

    if (twitterDescription) {
      score += 25;
      details.push('Twitter description is set');
    } else {
      recommendations.push('Add twitter:description meta tag');
    }

    if (twitterImage) {
      score += 25;
      details.push('Twitter image is set');
    } else {
      recommendations.push('Add twitter:image meta tag for better visibility');
    }

    return {
      id: generateResultId(this.category, 'Twitter Card'),
      name: 'Twitter Card',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.6,
      description: 'Analyzes Twitter Card meta tags',
      details,
      recommendations,
      rawData: {
        hasCard: !!twitterCard,
        cardType: twitterCard,
        hasTitle: !!twitterTitle,
        hasDescription: !!twitterDescription,
        hasImage: !!twitterImage,
      },
    };
  }

  /**
   * Analyze canonical URL
   */
  private analyzeCanonical(document: Document, url: string): AnalysisResult {
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalLink?.getAttribute('href');

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    if (canonical) {
      score += 50;
      details.push(`Canonical URL: ${canonical}`);

      // Check if canonical matches current URL
      try {
        const canonicalUrl = new URL(canonical, url);
        const currentUrl = new URL(url);
        
        if (canonicalUrl.href === currentUrl.href) {
          score += 50;
          details.push('Canonical URL matches current page URL');
        } else {
          details.push('Canonical URL differs from current page URL');
          recommendations.push('Ensure canonical URL points to the preferred version of this page');
        }
      } catch {
        details.push('Could not validate canonical URL');
      }
    } else {
      details.push('No canonical URL specified');
      recommendations.push('Add a canonical link tag to prevent duplicate content issues');
    }

    return {
      id: generateResultId(this.category, 'Canonical URL'),
      name: 'Canonical URL',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.1,
      description: 'Analyzes canonical URL implementation',
      details,
      recommendations,
    };
  }

  /**
   * Analyze language attribute
   */
  private analyzeLanguage(document: Document): AnalysisResult {
    const htmlElement = document.documentElement;
    const lang = htmlElement.getAttribute('lang');

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    if (lang) {
      score = 100;
      details.push(`Language attribute: "${lang}"`);
      
      // Validate language code format
      const langPattern = /^[a-z]{2,3}(-[a-z]{2,4})?$/i;
      if (langPattern.test(lang)) {
        details.push('Language code format is valid');
      } else {
        details.push('Language code format may not be standard');
        recommendations.push('Use standard language codes (e.g., en, en-US, es, fr)');
      }
    } else {
      details.push('No language attribute found on HTML element');
      recommendations.push('Add a lang attribute to the HTML element for accessibility and SEO');
    }

    return {
      id: generateResultId(this.category, 'Language Attribute'),
      name: 'Language Attribute',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.5,
      description: 'Analyzes HTML language attribute',
      details,
      recommendations,
    };
  }

  /**
   * Analyze keyword presence in key areas
   */
  private analyzeKeywordPresence(document: Document): AnalysisResult {
    const title = extractTextContent(document.querySelector('title'));
    const h1 = extractTextContent(document.querySelector('h1'));
    const metaDesc = getMetaContent(document, 'description') ?? '';
    const bodyText = document.body?.textContent?.toLowerCase() ?? '';

    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Extract potential keywords from title
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    if (titleWords.length === 0) {
      return {
        id: generateResultId(this.category, 'Keyword Consistency'),
        name: 'Keyword Consistency',
        category: this.category,
        severity: 'warning',
        score: 50,
        maxScore: 100,
        weight: 0.8,
        description: 'Analyzes keyword presence across key page elements',
        details: ['Could not extract keywords from title'],
        recommendations: ['Add a descriptive title with relevant keywords'],
      };
    }

    details.push(`Potential keywords from title: ${titleWords.slice(0, 5).join(', ')}`);

    // Check keyword presence in H1
    const h1Keywords = titleWords.filter((word) => h1.toLowerCase().includes(word));
    if (h1Keywords.length > 0) {
      score += 30;
      details.push(`Keywords in H1: ${h1Keywords.join(', ')}`);
    } else {
      recommendations.push('Include title keywords in your H1 heading');
    }

    // Check keyword presence in meta description
    const metaKeywords = titleWords.filter((word) => metaDesc.toLowerCase().includes(word));
    if (metaKeywords.length > 0) {
      score += 30;
      details.push(`Keywords in meta description: ${metaKeywords.join(', ')}`);
    } else {
      recommendations.push('Include relevant keywords in your meta description');
    }

    // Check keyword presence in body
    const bodyKeywords = titleWords.filter((word) => bodyText.includes(word));
    if (bodyKeywords.length >= titleWords.length * 0.5) {
      score += 40;
      details.push('Keywords are well-represented in page content');
    } else {
      score += 20;
      recommendations.push('Ensure your main keywords appear naturally throughout the content');
    }

    return {
      id: generateResultId(this.category, 'Keyword Consistency'),
      name: 'Keyword Consistency',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.8,
      description: 'Analyzes keyword presence across key page elements',
      details,
      recommendations,
    };
  }
}
