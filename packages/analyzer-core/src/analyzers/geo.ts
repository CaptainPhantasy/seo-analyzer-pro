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
 * GEO (Generative Engine Optimization) Analyzer
 * Analyzes AI citation optimization, FAQ schema, and quotable content
 */
export class GEOAnalyzer implements BaseAnalyzer {
  readonly category: AnalysisCategory = 'geo';

  async analyze(input: {
    document: Document;
    url: string;
  }): Promise<AnalysisResult[]> {
    const { document } = input;

    return [
      this.analyzeCitationReadiness(document),
      this.analyzeFAQSchema(document),
      this.analyzeSchemaOrg(document),
      this.analyzeQuotability(document),
      this.analyzeStatisticsPresence(document),
      this.analyzeDefinitionStructure(document),
      this.analyzeListStructure(document),
      this.analyzeTableStructure(document),
    ];
  }

  /**
   * Analyze citation readiness for AI engines
   */
  private analyzeCitationReadiness(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for quotable snippets (clear, concise statements)
    const paragraphs = Array.from(document.querySelectorAll('p'));
    const quotableParagraphs = paragraphs.filter((p) => {
      const text = extractTextContent(p);
      return text.length >= 40 && text.length <= 200 && text.endsWith('.');
    });

    if (quotableParagraphs.length >= 3) {
      score += 25;
      details.push(`${quotableParagraphs.length} quotable paragraphs found`);
    } else {
      recommendations.push('Add more concise, quotable paragraphs (40-200 characters)');
    }

    // Check for statistics and data
    const bodyText = document.body?.textContent ?? '';
    const statistics = this.extractStatistics(bodyText);
    if (statistics.length >= 2) {
      score += 25;
      details.push(`${statistics.length} statistical claims found`);
    } else {
      recommendations.push('Include specific statistics and data points');
    }

    // Check for expert quotes
    const blockquotes = document.querySelectorAll('blockquote');
    if (blockquotes.length > 0) {
      score += 25;
      details.push(`${blockquotes.length} quote(s) found`);
    } else {
      recommendations.push('Add expert quotes or citations');
    }

    // Check for clear definitions
    const definitions = this.extractDefinitions(document);
    if (definitions.length > 0) {
      score += 25;
      details.push(`${definitions.length} definition(s) found`);
    } else {
      recommendations.push('Add clear definitions for key terms');
    }

    return {
      id: generateResultId(this.category, 'Citation Readiness'),
      name: 'Citation Readiness',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.5,
      description: 'Analyzes how easily AI engines can cite your content',
      details,
      recommendations,
      rawData: {
        quotableParagraphs: quotableParagraphs.length,
        statisticsCount: statistics.length,
        quotesCount: blockquotes.length,
        definitionsCount: definitions.length,
      },
    };
  }

  /**
   * Analyze FAQ schema implementation
   */
  private analyzeFAQSchema(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for FAQPage schema
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    let faqSchema: { mainEntity?: Array<{ name?: string }> } | null = null;

    for (const script of scripts) {
      try {
        const content = script.textContent ?? '';
        const json = JSON.parse(content) as { '@type'?: string | string[], mainEntity?: Array<{ name?: string }> };
        
        const type = json['@type'];
        const isFAQ = type === 'FAQPage' || (Array.isArray(type) && type.includes('FAQPage'));
        
        if (isFAQ) {
          faqSchema = json;
          break;
        }
      } catch {
        // Invalid JSON, continue
      }
    }

    if (faqSchema) {
      score += 50;
      const questionCount = faqSchema.mainEntity?.length ?? 0;
      details.push(`FAQ schema found with ${questionCount} question(s)`);
      
      if (questionCount >= 3) {
        score += 30;
        details.push('Good number of FAQ entries');
      }
    } else {
      recommendations.push('Add FAQPage structured data for better AI visibility');
    }

    // Check for visible FAQ structure
    const faqHeadings = Array.from(document.querySelectorAll('h2, h3')).filter((h) =>
      /faq|frequently asked|questions?/i.test(extractTextContent(h))
    );

    if (faqHeadings.length > 0) {
      score += 20;
      details.push('FAQ section detected in content');
    }

    return {
      id: generateResultId(this.category, 'FAQ Schema'),
      name: 'FAQ Schema',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.3,
      description: 'Analyzes FAQ schema for AI answer engines',
      details,
      recommendations,
      rawData: {
        hasFAQSchema: !!faqSchema,
        faqCount: faqSchema?.mainEntity?.length ?? 0,
      },
    };
  }

  /**
   * Analyze Schema.org implementation
   */
  private analyzeSchemaOrg(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const schemaTypes: string[] = [];
    const schemaErrors: string[] = [];

    for (const script of scripts) {
      try {
        const content = script.textContent ?? '';
        const json = JSON.parse(content) as Record<string, unknown>;
        
        // Handle @type which can be string or array
        const type = json['@type'];
        if (typeof type === 'string') {
          schemaTypes.push(type);
        } else if (Array.isArray(type)) {
          schemaTypes.push(...type.filter((t): t is string => typeof t === 'string'));
        }
      } catch (e) {
        schemaErrors.push('Invalid JSON-LD found');
      }
    }

    details.push(`Schema types found: ${schemaTypes.length > 0 ? schemaTypes.join(', ') : 'None'}`);

    // Score based on schema presence and types
    if (schemaTypes.length > 0) {
      score += 30;

      const valuableSchemas = ['Article', 'HowTo', 'FAQPage', 'Product', 'Organization', 'LocalBusiness'];
      const hasValuable = schemaTypes.some((type) => valuableSchemas.includes(type));
      
      if (hasValuable) {
        score += 40;
        details.push('Contains high-value schema types for AI');
      }

      // Check for specific AI-friendly schemas
      if (schemaTypes.includes('HowTo')) {
        score += 15;
        details.push('HowTo schema detected - excellent for AI answers');
      }
      
      if (schemaTypes.includes('Article')) {
        score += 15;
        details.push('Article schema detected');
      }
    } else {
      recommendations.push('Add structured data (JSON-LD) to help AI engines understand your content');
    }

    if (schemaErrors.length > 0) {
      details.push(...schemaErrors);
    }

    return {
      id: generateResultId(this.category, 'Schema.org'),
      name: 'Schema.org',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.2,
      description: 'Analyzes Schema.org structured data implementation',
      details,
      recommendations,
      rawData: {
        hasSchema: schemaTypes.length > 0,
        types: schemaTypes,
        schemaErrors,
      },
    };
  }

  /**
   * Analyze content quotability
   */
  private analyzeQuotability(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for bullet points
    const totalListItems = document.querySelectorAll('li').length;

    if (totalListItems >= 5) {
      score += 25;
      details.push(`${totalListItems} list items found`);
    } else if (totalListItems > 0) {
      score += 10;
      recommendations.push('Add more structured lists for better quotability');
    } else {
      recommendations.push('Use bullet points or numbered lists to improve quotability');
    }

    // Check for tables
    const tables = document.querySelectorAll('table');
    if (tables.length > 0) {
      score += 25;
      details.push(`${tables.length} table(s) found`);
    }

    // Check for pull quotes or highlighted content
    const blockquotes = document.querySelectorAll('blockquote');
    const highlights = document.querySelectorAll('mark, .highlight, .callout');
    
    if (blockquotes.length > 0 || highlights.length > 0) {
      score += 25;
      details.push('Highlighted/quoted content found');
    } else {
      recommendations.push('Add pull quotes or highlighted key takeaways');
    }

    // Analyze sentence length for quotability
    const paragraphs = Array.from(document.querySelectorAll('p'));
    const sentenceLengths = paragraphs
      .map((p) => extractTextContent(p))
      .filter((text) => text.length > 0)
      .map((text) => text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);

    const avgSentences = sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0;

    if (avgSentences >= 2 && avgSentences <= 5) {
      score += 25;
      details.push('Good paragraph structure for AI extraction');
    } else {
      recommendations.push('Break long paragraphs into shorter, more quotable chunks');
    }

    return {
      id: generateResultId(this.category, 'Content Quotability'),
      name: 'Content Quotability',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.4,
      description: 'Analyzes how easily content can be quoted by AI engines',
      details,
      recommendations,
    };
  }

  /**
   * Analyze statistics presence
   */
  private analyzeStatisticsPresence(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const bodyText = document.body?.textContent ?? '';
    const statistics = this.extractStatistics(bodyText);

    if (statistics.length >= 5) {
      score = 100;
      details.push(`Excellent statistics presence: ${statistics.length} data points`);
      details.push('Sample statistics:', ...statistics.slice(0, 3));
    } else if (statistics.length >= 3) {
      score = 75;
      details.push(`Good statistics presence: ${statistics.length} data points`);
    } else if (statistics.length >= 1) {
      score = 40;
      details.push(`${statistics.length} statistical data point(s) found`);
      recommendations.push('Add more specific statistics and data to increase citation potential');
    } else {
      recommendations.push('Include specific statistics, percentages, and data points');
      recommendations.push('AI engines prefer content with verifiable numerical data');
    }

    return {
      id: generateResultId(this.category, 'Statistics & Data'),
      name: 'Statistics & Data',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.1,
      description: 'Analyzes presence of statistics and numerical data',
      details,
      recommendations,
      rawData: {
        statisticsCount: statistics.length,
        statistics: statistics.slice(0, 5),
      },
    };
  }

  /**
   * Analyze definition structure
   */
  private analyzeDefinitionStructure(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const definitions = this.extractDefinitions(document);

    // Check for definition lists
    const dlElements = document.querySelectorAll('dl');
    if (dlElements.length > 0) {
      score += 30;
      details.push(`${dlElements.length} definition list(s) found`);
    }

    // Check for "is" or "means" patterns
    if (definitions.length >= 3) {
      score += 40;
      details.push(`${definitions.length} definition(s) detected`);
    } else if (definitions.length >= 1) {
      score += 20;
      details.push(`${definitions.length} definition(s) detected`);
    }

    // Check for bold/strong terms followed by explanations
    const strongElements = document.querySelectorAll('strong, b');
    let termExplanationPairs = 0;
    
    strongElements.forEach((strong) => {
      const parent = strong.parentElement;
      if (parent) {
        const text = extractTextContent(parent);
        const strongText = extractTextContent(strong);
        if (text.length > strongText.length * 2) {
          termExplanationPairs++;
        }
      }
    });

    if (termExplanationPairs >= 3) {
      score += 30;
      details.push('Good use of bold terms with explanations');
    } else if (termExplanationPairs >= 1) {
      score += 15;
    }

    if (score < 50) {
      recommendations.push('Add clear definitions for key terms using "X is..." patterns');
      recommendations.push('Use definition lists (<dl>) for term explanations');
    }

    return {
      id: generateResultId(this.category, 'Definition Structure'),
      name: 'Definition Structure',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.9,
      description: 'Analyzes clarity of term definitions for AI understanding',
      details,
      recommendations,
    };
  }

  /**
   * Analyze list structure
   */
  private analyzeListStructure(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const ulLists = document.querySelectorAll('ul');
    const olLists = document.querySelectorAll('ol');
    const listItems = document.querySelectorAll('li');

    const totalLists = ulLists.length + olLists.length;

    details.push(`Unordered lists: ${ulLists.length}`);
    details.push(`Ordered lists: ${olLists.length}`);
    details.push(`Total list items: ${listItems.length}`);

    if (totalLists >= 3) {
      score += 40;
      details.push('Good use of lists for structured content');
    } else if (totalLists >= 1) {
      score += 20;
    } else {
      recommendations.push('Add lists to structure information for AI extraction');
    }

    // Check for numbered steps (HowTo pattern)
    if (olLists.length > 0) {
      score += 30;
      details.push('Numbered lists detected - great for step-by-step content');
    }

    // Check list item quality
    const avgItemLength = listItems.length > 0
      ? Array.from(listItems).reduce((sum, li) => sum + extractTextContent(li).length, 0) / listItems.length
      : 0;

    if (avgItemLength >= 20 && avgItemLength <= 150) {
      score += 30;
      details.push('List items have good length for AI extraction');
    } else if (avgItemLength > 0) {
      score += 15;
      if (avgItemLength < 20) {
        recommendations.push('Expand list items with more detail');
      } else if (avgItemLength > 150) {
        recommendations.push('Consider breaking down long list items');
      }
    }

    return {
      id: generateResultId(this.category, 'List Structure'),
      name: 'List Structure',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.0,
      description: 'Analyzes list structure for AI-friendly content',
      details,
      recommendations,
    };
  }

  /**
   * Analyze table structure
   */
  private analyzeTableStructure(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const tables = document.querySelectorAll('table');

    if (tables.length === 0) {
      details.push('No tables found');
      recommendations.push('Consider adding tables for structured data comparison');
      recommendations.push('Tables are highly valuable for AI answer extraction');
    } else {
      details.push(`${tables.length} table(s) found`);

      tables.forEach((table, index) => {
        const rows = table.querySelectorAll('tr');
        const headers = table.querySelectorAll('th');
        
        if (headers.length > 0) {
          score += 20;
          details.push(`Table ${index + 1}: Has header row with ${headers.length} columns`);
        } else {
          details.push(`Table ${index + 1}: Missing header row`);
        }

        if (rows.length >= 3) {
          score += 15;
        }
      });

      // Cap score at max
      score = Math.min(score, maxScore);

      if (score >= 50) {
        details.push('Tables are well-structured for AI extraction');
      }
    }

    return {
      id: generateResultId(this.category, 'Table Structure'),
      name: 'Table Structure',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 0.8,
      description: 'Analyzes table structure for data extraction',
      details,
      recommendations,
    };
  }

  /**
   * Extract statistics from text
   */
  private extractStatistics(text: string): string[] {
    const patterns = [
      /\d+(?:\.\d+)?%/g, // Percentages
      /\$\d+(?:\.\d+)?(?:\s?(?:million|billion|trillion))?/gi, // Currency
      /\d+(?:,\d{3})*(?:\.\d+)?\s?(?:million|billion|trillion)/gi, // Large numbers
      /\d+(?:\.\d+)?\s?(?:percent|percentage)/gi, // Written percentages
      /(?:average|mean|median)\s+(?:of\s+)?\d+/gi, // Averages
    ];

    const statistics: string[] = [];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        statistics.push(...matches);
      }
    }

    return [...new Set(statistics)]; // Remove duplicates
  }

  /**
   * Extract definitions from document
   */
  private extractDefinitions(document: Document): string[] {
    const definitions: string[] = [];
    const paragraphs = document.querySelectorAll('p');

    // Patterns for definitions
    const patterns = [
      /([A-Z][a-zA-Z\s]+)\s+(?:is|are|means|refers to|can be defined as)\s+/,
      /(?:the term\s+)?["']([^"']+)["']\s+(?:means|refers to|is defined as)/,
    ];

    paragraphs.forEach((p) => {
      const text = extractTextContent(p);
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
          definitions.push(match[1].trim());
        }
      }
    });

    return definitions;
  }
}
