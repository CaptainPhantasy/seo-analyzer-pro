/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import type {
  AnalysisResult,
  ActionItem,
  Priority,
  AnalysisCategory,
} from '@seo-analyzer-pro/types';

/**
 * Action Item Generator
 * Generates prioritized, actionable recommendations
 */
export class ActionItemGenerator {
  /**
   * Generate action items from analysis results
   */
  generate(results: AnalysisResult[]): ActionItem[] {
    const actionItems: ActionItem[] = [];

    // Process each result and generate action items
    for (const result of results) {
      const items = this.generateFromResult(result);
      actionItems.push(...items);
    }

    // Sort by priority
    return this.sortByPriority(actionItems);
  }

  /**
   * Generate action items from a single result
   */
  private generateFromResult(result: AnalysisResult): ActionItem[] {
    const items: ActionItem[] = [];
    const percentage = (result.score / result.maxScore) * 100;

    // Only generate action items for non-success results
    if (result.severity === 'success' && percentage >= 90) {
      return items;
    }

    // Generate action items from recommendations
    for (const recommendation of result.recommendations) {
      const priority = this.determinePriority(result, percentage);
      const effort = this.determineEffort(result, recommendation);
      const impact = this.determineImpact(result, percentage);

      items.push({
        id: `action-${result.id}-${items.length}`,
        priority,
        category: result.category,
        title: this.generateTitle(result.name, recommendation),
        description: recommendation,
        impact,
        effort,
        relatedResults: [result.id],
        llmInstruction: this.generateLLMInstruction(result, recommendation),
        implementation: this.generateImplementation(result, recommendation),
      });
    }

    return items;
  }

  /**
   * Determine priority based on severity and score
   */
  private determinePriority(result: AnalysisResult, percentage: number): Priority {
    if (result.severity === 'critical' || percentage < 30) {
      return 'critical';
    }
    if (result.severity === 'warning' || percentage < 50) {
      return 'high';
    }
    if (result.severity === 'info' || percentage < 70) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine effort required
   */
  private determineEffort(
    result: AnalysisResult,
    recommendation: string
  ): 'low' | 'medium' | 'high' {
    const lowEffortKeywords = [
      'add',
      'include',
      'update',
      'set',
      'specify',
      'use',
    ];
    const highEffortKeywords = [
      'rewrite',
      'restructure',
      'redesign',
      'migrate',
      'implement',
      'create',
      'develop',
    ];

    const recLower = recommendation.toLowerCase();

    if (highEffortKeywords.some((keyword) => recLower.includes(keyword))) {
      return 'high';
    }
    if (lowEffortKeywords.some((keyword) => recLower.includes(keyword))) {
      return 'low';
    }

    // Category-based effort estimation
    const highEffortCategories: AnalysisCategory[] = ['eeat', 'core'];
    if (highEffortCategories.includes(result.category)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine impact description
   */
  private determineImpact(result: AnalysisResult, percentage: number): string {
    const gap = 100 - percentage;
    
    if (result.category === 'geo') {
      if (gap > 50) {
        return 'Significantly improves AI citation potential and answer engine visibility';
      }
      return 'Improves chances of being cited by AI answer engines';
    }

    if (result.category === 'eeat') {
      if (gap > 50) {
        return 'Major impact on search rankings and user trust';
      }
      return 'Improves credibility and search ranking potential';
    }

    if (result.category === 'technical') {
      if (gap > 50) {
        return 'Critical for search engine crawling and indexing';
      }
      return 'Improves technical SEO foundation';
    }

    if (gap > 50) {
      return 'High impact on search visibility and user experience';
    }
    return 'Moderate impact on SEO performance';
  }

  /**
   * Generate action item title
   */
  private generateTitle(resultName: string, recommendation: string): string {
    // Extract first few words from recommendation
    const words = recommendation.split(' ').slice(0, 6).join(' ');
    return `${resultName}: ${words}${words.length < recommendation.length ? '...' : ''}`;
  }

  /**
   * Generate LLM instruction for AI assistants
   */
  private generateLLMInstruction(
    result: AnalysisResult,
    recommendation: string
  ): string {
    const categoryContext = this.getCategoryContext(result.category);
    
    return `For the page being analyzed, ${categoryContext}: ${recommendation.toLowerCase()}. This addresses the "${result.name}" analysis finding which currently scores ${result.score}/${result.maxScore}.`;
  }

  /**
   * Get context for category
   */
  private getCategoryContext(category: AnalysisCategory): string {
    const contexts: Record<AnalysisCategory, string> = {
      onpage: 'improve the on-page SEO by',
      geo: 'optimize for AI answer engines by',
      core: 'enhance content quality by',
      eeat: 'strengthen credibility signals by',
      technical: 'fix technical SEO issues by',
    };
    return contexts[category];
  }

  /**
   * Generate implementation guidance
   */
  private generateImplementation(
    result: AnalysisResult,
    _recommendation: string
  ): string {
    const implementations: Record<string, string> = {
      'Title Tag': 'Update the <title> tag in the <head> section of your HTML.',
      'Meta Description':
        'Add or update the meta description tag: <meta name="description" content="your description">',
      'Heading Structure':
        'Restructure headings to maintain proper hierarchy: H1 → H2 → H3.',
      'Image Optimization':
        'Add alt attributes to images: <img src="image.jpg" alt="descriptive text">',
      'Canonical URL':
        'Add canonical link: <link rel="canonical" href="https://example.com/page">',
      'Open Graph':
        'Add Open Graph meta tags: <meta property="og:title" content="Title">',
      'FAQ Schema':
        'Add FAQPage structured data in JSON-LD format to your page.',
      'Schema.org':
        'Implement relevant schema.org types using JSON-LD in the <head> section.',
      'Viewport':
        'Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
      'HTTPS':
        'Obtain an SSL certificate and configure your server for HTTPS.',
    };

    // Check for matching implementation guidance
    for (const [key, guidance] of Object.entries(implementations)) {
      if (result.name.includes(key) || key.includes(result.name)) {
        return guidance;
      }
    }

    // Default implementation guidance
    return `Review the ${result.name} section and apply the recommended changes to improve your score from ${result.score} to ${result.maxScore}.`;
  }

  /**
   * Sort action items by priority
   */
  private sortByPriority(items: ActionItem[]): ActionItem[] {
    const priorityOrder: Record<Priority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return items.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort by effort (low effort first for same priority)
      const effortOrder = { low: 0, medium: 1, high: 2 };
      return effortOrder[a.effort] - effortOrder[b.effort];
    });
  }

  /**
   * Get action items by category
   */
  getByCategory(items: ActionItem[], category: AnalysisCategory): ActionItem[] {
    return items.filter((item) => item.category === category);
  }

  /**
   * Get action items by priority
   */
  getByPriority(items: ActionItem[], priority: Priority): ActionItem[] {
    return items.filter((item) => item.priority === priority);
  }

  /**
   * Get quick wins (high impact, low effort)
   */
  getQuickWins(items: ActionItem[]): ActionItem[] {
    return items.filter(
      (item) =>
        item.effort === 'low' &&
        (item.priority === 'critical' || item.priority === 'high')
    );
  }

  /**
   * Generate summary statistics
   */
  generateSummary(items: ActionItem[]): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    quickWins: number;
  } {
    return {
      total: items.length,
      critical: items.filter((i) => i.priority === 'critical').length,
      high: items.filter((i) => i.priority === 'high').length,
      medium: items.filter((i) => i.priority === 'medium').length,
      low: items.filter((i) => i.priority === 'low').length,
      quickWins: this.getQuickWins(items).length,
    };
  }
}
