/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import type { AnalysisResult, AnalysisCategory } from '@seo-analyzer-pro/types';
import {
  type BaseAnalyzer,
  extractTextContent,
  calculatePercentage,
  getSeverityFromScore,
  generateResultId,
} from '../types.js';

/**
 * CORE Analyzer
 * Analyzes Contextual Clarity, Organization, Referenceability, and Exclusivity
 */
export class COREAnalyzer implements BaseAnalyzer {
  readonly category: AnalysisCategory = 'core';

  async analyze(input: {
    document: Document;
    url: string;
  }): Promise<AnalysisResult[]> {
    const { document } = input;

    return [
      this.analyzeContextualClarity(document),
      this.analyzeOrganization(document),
      this.analyzeReferenceability(document),
      this.analyzeExclusivity(document),
    ];
  }

  /**
   * Analyze Contextual Clarity
   * How clear and focused is the content on its main topic?
   */
  private analyzeContextualClarity(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Extract main content
    const title = extractTextContent(document.querySelector('title'));
    const h1 = extractTextContent(document.querySelector('h1'));
    const bodyText = document.body?.textContent ?? '';

    // Extract keywords from title and H1
    const titleKeywords = this.extractKeywords(title);
    const h1Keywords = this.extractKeywords(h1);

    // Check topic consistency between title and H1
    const keywordOverlap = titleKeywords.filter((k) => h1Keywords.includes(k));
    
    if (keywordOverlap.length >= 2) {
      score += 30;
      details.push('Strong topic alignment between title and H1');
    } else if (keywordOverlap.length >= 1) {
      score += 15;
      details.push('Some topic alignment between title and H1');
    } else {
      recommendations.push('Align your H1 heading more closely with your page title');
    }

    // Analyze semantic density (keyword usage in content)
    const bodyWords = bodyText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const keywordDensity = titleKeywords.filter((keyword) =>
      bodyWords.some((word) => word.includes(keyword))
    );

    if (keywordDensity.length >= 3) {
      score += 30;
      details.push('Keywords well-distributed throughout content');
    } else if (keywordDensity.length >= 1) {
      score += 15;
      details.push('Some keyword presence in content');
    } else {
      recommendations.push('Include your main keywords naturally throughout the content');
    }

    // Check for topic signals (related terms)
    const topicSignals = this.detectTopicSignals(bodyText);
    if (topicSignals.length >= 5) {
      score += 20;
      details.push(`Strong topic signals: ${topicSignals.slice(0, 5).join(', ')}`);
    } else if (topicSignals.length >= 2) {
      score += 10;
      details.push(`Some topic signals: ${topicSignals.slice(0, 3).join(', ')}`);
    }

    // Check for ambiguity (vague language)
    const vaguePhrases = this.detectVaguePhrases(bodyText);
    if (vaguePhrases.length === 0) {
      score += 20;
      details.push('Content uses specific, clear language');
    } else {
      score += 10;
      details.push(`Some vague phrases detected: ${vaguePhrases.slice(0, 3).join(', ')}`);
      recommendations.push('Replace vague phrases with specific, concrete language');
    }

    return {
      id: generateResultId(this.category, 'Contextual Clarity'),
      name: 'Contextual Clarity',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.3,
      description: 'Analyzes how clearly the content communicates its main topic',
      details,
      recommendations,
      rawData: {
        titleKeywords,
        h1Keywords,
        keywordOverlap: keywordOverlap.length,
        topicSignals: topicSignals.length,
        vaguePhrases: vaguePhrases.length,
      },
    };
  }

  /**
   * Analyze Organization
   * How well-structured is the content?
   */
  private analyzeOrganization(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for table of contents
    const tocIndicators = document.querySelectorAll('[class*="toc"], [id*="toc"], nav ul li a[href^="#"]');
    const hasTOC = tocIndicators.length > 0;

    if (hasTOC) {
      score += 25;
      details.push('Table of contents or navigation detected');
    } else {
      recommendations.push('Add a table of contents for long-form content');
    }

    // Analyze heading structure
    const h2Count = document.querySelectorAll('h2').length;
    const h3Count = document.querySelectorAll('h3').length;

    if (h2Count >= 3) {
      score += 25;
      details.push(`Well-structured with ${h2Count} main sections`);
    } else if (h2Count >= 1) {
      score += 15;
      details.push(`${h2Count} main section(s) found`);
    } else {
      recommendations.push('Add H2 headings to create clear sections');
    }

    // Check for introduction
    const firstParagraph = document.querySelector('p');
    const introText = extractTextContent(firstParagraph);
    const hasIntro = introText.length >= 50 && (
      introText.toLowerCase().includes('in this') ||
      introText.toLowerCase().includes('this guide') ||
      introText.toLowerCase().includes('this article') ||
      introText.toLowerCase().includes('we will') ||
      introText.toLowerCase().includes("you'll learn") ||
      introText.toLowerCase().includes('overview')
    );

    if (hasIntro) {
      score += 15;
      details.push('Clear introduction detected');
    } else {
      recommendations.push('Add a clear introduction explaining what the content covers');
    }

    // Check for conclusion
    const lastParagraphs = Array.from(document.querySelectorAll('p')).slice(-3);
    const hasConclusion = lastParagraphs.some((p) => {
      const text = extractTextContent(p).toLowerCase();
      return text.includes('conclusion') ||
             text.includes('summary') ||
             text.includes('in summary') ||
             text.includes('to conclude') ||
             text.includes('key takeaways') ||
             text.includes('final thoughts');
    });

    if (hasConclusion) {
      score += 15;
      details.push('Conclusion section detected');
    } else {
      recommendations.push('Add a conclusion or summary section');
    }

    // Check section length consistency
    const sections = Array.from(document.querySelectorAll('h2')).map((h2) => {
      let content = '';
      let sibling = h2.nextElementSibling;
      while (sibling && sibling.tagName !== 'H2') {
        content += extractTextContent(sibling);
        sibling = sibling.nextElementSibling;
      }
      return content.length;
    });

    if (sections.length >= 2) {
      const avgLength = sections.reduce((a, b) => a + b, 0) / sections.length;
      const variance = sections.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sections.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev < avgLength * 0.5) {
        score += 20;
        details.push('Sections have consistent length');
      } else {
        score += 10;
        details.push('Sections vary in length');
      }
    }

    return {
      id: generateResultId(this.category, 'Organization'),
      name: 'Organization',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.2,
      description: 'Analyzes content structure and organization',
      details,
      recommendations,
      rawData: {
        hasTOC,
        sectionCount: h2Count,
        subsectionCount: h3Count,
        hasIntro,
        hasConclusion,
      },
    };
  }

  /**
   * Analyze Referenceability
   * How likely is this content to be referenced/cited?
   */
  private analyzeReferenceability(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for citations/references
    const citations = document.querySelectorAll('a[href*="doi"], a[href*="scholar"], cite, .citation, .reference');
    const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]')).filter((link) => {
      const href = link.getAttribute('href') ?? '';
      return !href.includes(document.location?.hostname ?? '');
    });

    if (citations.length >= 3) {
      score += 30;
      details.push(`${citations.length} citation(s)/reference(s) found`);
    } else if (citations.length >= 1) {
      score += 15;
      details.push(`${citations.length} citation(s) found`);
    } else {
      recommendations.push('Add citations to authoritative sources');
    }

    if (externalLinks.length >= 3) {
      score += 20;
      details.push(`${externalLinks.length} external reference link(s)`);
    } else if (externalLinks.length >= 1) {
      score += 10;
    }

    // Check for author information
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '[class*="author"]',
      'meta[name="author"]',
    ];
    const hasAuthor = authorSelectors.some((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        if (element.tagName === 'META') {
          return (element as HTMLMetaElement).content?.length > 0;
        }
        return extractTextContent(element).length > 0;
      }
      return false;
    });

    if (hasAuthor) {
      score += 20;
      details.push('Author information found');
    } else {
      recommendations.push('Add author information to increase credibility');
    }

    // Check for dates
    const dateSelectors = [
      'time',
      '[datetime]',
      'meta[property="article:published_time"]',
      'meta[property="article:modified_time"]',
      '.date',
      '[class*="date"]',
    ];
    const hasPublishDate = dateSelectors.some((selector) => {
      const element = document.querySelector(selector);
      return element !== null;
    });

    if (hasPublishDate) {
      score += 15;
      details.push('Publication/modification date found');
    } else {
      recommendations.push('Add publication and last modified dates');
    }

    // Check for trust signals
    const trustSignals = this.detectTrustSignals(document);
    if (trustSignals.length >= 3) {
      score += 15;
      details.push(`Trust signals: ${trustSignals.slice(0, 3).join(', ')}`);
    } else if (trustSignals.length >= 1) {
      score += 8;
    }

    return {
      id: generateResultId(this.category, 'Referenceability'),
      name: 'Referenceability',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.2,
      description: 'Analyzes how likely content is to be referenced by others',
      details,
      recommendations,
      rawData: {
        citationsCount: citations.length,
        externalLinksCount: externalLinks.length,
        hasAuthor,
        hasPublishDate,
        trustSignals,
      },
    };
  }

  /**
   * Analyze Exclusivity
   * Does the content offer unique value?
   */
  private analyzeExclusivity(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const bodyText = document.body?.textContent ?? '';

    // Check for original data/research
    const dataIndicators = [
      /our research/i,
      /our study/i,
      /we surveyed/i,
      /we analyzed/i,
      /original data/i,
      /proprietary/i,
      /exclusive/i,
    ];

    const hasOriginalData = dataIndicators.some((pattern) => pattern.test(bodyText));
    if (hasOriginalData) {
      score += 30;
      details.push('Original research/data indicators found');
    } else {
      recommendations.push('Add original research, data, or insights');
    }

    // Check for case studies
    const caseStudyIndicators = [
      /case study/i,
      /case studies/i,
      /real example/i,
      /client success/i,
      /customer story/i,
    ];

    const hasCaseStudies = caseStudyIndicators.some((pattern) => pattern.test(bodyText));
    if (hasCaseStudies) {
      score += 25;
      details.push('Case studies or examples found');
    } else {
      recommendations.push('Include case studies or real-world examples');
    }

    // Check for expert insights
    const expertIndicators = [
      /expert tip/i,
      /pro tip/i,
      /insider/i,
      /industry secret/i,
      /little known/i,
      /we recommend/i,
    ];

    const hasExpertInsights = expertIndicators.some((pattern) => pattern.test(bodyText));
    if (hasExpertInsights) {
      score += 20;
      details.push('Expert insights found');
    } else {
      recommendations.push('Add expert tips or insider insights');
    }

    // Check for unique value propositions
    const uvpIndicators = [
      /only.*that/i,
      /unique/i,
      /unlike other/i,
      /exclusive/i,
      /first ever/i,
      /groundbreaking/i,
    ];

    const hasUVP = uvpIndicators.some((pattern) => pattern.test(bodyText));
    if (hasUVP) {
      score += 25;
      details.push('Unique value propositions found');
    } else {
      recommendations.push('Highlight what makes your content unique');
    }

    return {
      id: generateResultId(this.category, 'Exclusivity'),
      name: 'Exclusivity',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.3,
      description: 'Analyzes unique value and differentiation',
      details,
      recommendations,
      rawData: {
        hasOriginalData,
        hasCaseStudies,
        hasExpertInsights,
        hasUVP,
      },
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'this', 'that', 'these', 'those', 'it', 'its', 'your', 'our', 'their',
    ]);

    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  /**
   * Detect topic signals in content
   */
  private detectTopicSignals(text: string): string[] {
    // Look for repeated significant terms
    const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4);
    const wordFreq = new Map<string, number>();

    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Detect vague phrases
   */
  private detectVaguePhrases(text: string): string[] {
    const vaguePatterns = [
      /\bthings to\b/gi,
      /\bstuff\b/gi,
      /\bsomething\b/gi,
      /\banything\b/gi,
      /\beverything\b/gi,
      /\bsome people say\b/gi,
      /\bmany people\b/gi,
      /\ba lot of\b/gi,
      /\bquite a few\b/gi,
    ];

    const found: string[] = [];
    vaguePatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        found.push(...matches);
      }
    });

    return found;
  }

  /**
   * Detect trust signals
   */
  private detectTrustSignals(document: Document): string[] {
    const signals: string[] = [];
    const bodyText = document.body?.textContent ?? '';

    const trustPatterns = [
      { pattern: /verified/i, signal: 'Verified badge' },
      { pattern: /certified/i, signal: 'Certification' },
      { pattern: /award/i, signal: 'Awards' },
      { pattern: /accredited/i, signal: 'Accreditation' },
      { pattern: /trusted by/i, signal: 'Trust indicators' },
      { pattern: /as seen in/i, signal: 'Media mentions' },
      { pattern: /featured in/i, signal: 'Featured content' },
    ];

    trustPatterns.forEach(({ pattern, signal }) => {
      if (pattern.test(bodyText)) {
        signals.push(signal);
      }
    });

    // Check for review/rating elements
    const reviewElements = document.querySelectorAll(
      '[class*="rating"], [class*="review"], [itemprop*="rating"]'
    );
    if (reviewElements.length > 0) {
      signals.push('Reviews/Ratings');
    }

    return signals;
  }
}
