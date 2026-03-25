/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import type { AnalysisResult, AnalysisCategory } from '@seo-analyzer-pro/types';

/**
 * LLM Prompt Generator
 * Generates copy-ready prompts for AI assistants to help fix SEO issues
 */
export class LLMPromptGenerator {
  /**
   * Generate LLM prompts from analysis results
   */
  generate(results: AnalysisResult[], url: string): string[] {
    const prompts: string[] = [];

    // Group results by category
    const groupedResults = this.groupByCategory(results);

    // Generate category-specific prompts
    for (const [category, categoryResults] of Object.entries(groupedResults)) {
      const prompt = this.generateCategoryPrompt(
        category as AnalysisCategory,
        categoryResults,
        url
      );
      if (prompt) {
        prompts.push(prompt);
      }
    }

    // Generate overall optimization prompt
    const overallPrompt = this.generateOverallPrompt(results, url);
    prompts.unshift(overallPrompt);

    return prompts;
  }

  /**
   * Group results by category
   */
  private groupByCategory(
    results: AnalysisResult[]
  ): Record<AnalysisCategory, AnalysisResult[]> {
    const grouped: Partial<Record<AnalysisCategory, AnalysisResult[]>> = {};

    for (const result of results) {
      if (!grouped[result.category]) {
        grouped[result.category] = [];
      }
      grouped[result.category]!.push(result);
    }

    return grouped as Record<AnalysisCategory, AnalysisResult[]>;
  }

  /**
   * Generate overall optimization prompt
   */
  private generateOverallPrompt(
    results: AnalysisResult[],
    url: string
  ): string {
    const criticalIssues = results.filter((r) => r.severity === 'critical');
    const warnings = results.filter((r) => r.severity === 'warning');

    let prompt = `## SEO Optimization Request for ${url}\n\n`;
    prompt += `I need help optimizing this webpage for both traditional SEO and AI answer engines (GEO).\n\n`;

    if (criticalIssues.length > 0) {
      prompt += `### Critical Issues to Address\n`;
      criticalIssues.forEach((issue) => {
        prompt += `- **${issue.name}**: ${issue.recommendations.join(' ')}\n`;
      });
      prompt += '\n';
    }

    if (warnings.length > 0) {
      prompt += `### Warnings to Consider\n`;
      warnings.slice(0, 5).forEach((issue) => {
        prompt += `- **${issue.name}**: ${issue.recommendations.join(' ')}\n`;
      });
      prompt += '\n';
    }

    prompt += `### Request\n`;
    prompt += `Please provide:\n`;
    prompt += `1. A prioritized action plan to address these issues\n`;
    prompt += `2. Specific HTML/meta tag implementations where applicable\n`;
    prompt += `3. Content suggestions to improve E-E-A-T signals\n`;
    prompt += `4. Structured data recommendations for AI visibility\n`;

    return prompt;
  }

  /**
   * Generate category-specific prompt
   */
  private generateCategoryPrompt(
    category: AnalysisCategory,
    results: AnalysisResult[],
    url: string
  ): string | null {
    const issues = results.filter(
      (r) => r.severity === 'critical' || r.severity === 'warning'
    );

    if (issues.length === 0) {
      return null;
    }

    const generators: Record<
      AnalysisCategory,
      (results: AnalysisResult[], url: string) => string
    > = {
      onpage: this.generateOnPagePrompt.bind(this),
      geo: this.generateGEOPrompt.bind(this),
      core: this.generateCOREPrompt.bind(this),
      eeat: this.generateEEATPrompt.bind(this),
      technical: this.generateTechnicalPrompt.bind(this),
    };

    return generators[category](issues, url);
  }

  /**
   * Generate On-Page SEO prompt
   */
  private generateOnPagePrompt(results: AnalysisResult[], url: string): string {
    let prompt = `## On-Page SEO Optimization for ${url}\n\n`;
    prompt += `Help me optimize the on-page SEO elements based on these findings:\n\n`;

    results.forEach((result) => {
      prompt += `### ${result.name} (Score: ${result.score}/${result.maxScore})\n`;
      prompt += `${result.description}\n\n`;
      prompt += `**Current Issues:**\n`;
      result.details.forEach((detail) => {
        prompt += `- ${detail}\n`;
      });
      prompt += `\n**Recommendations:**\n`;
      result.recommendations.forEach((rec) => {
        prompt += `- ${rec}\n`;
      });
      prompt += '\n';
    });

    prompt += `### Request\n`;
    prompt += `Please provide:\n`;
    prompt += `1. Optimized title tag (50-60 characters)\n`;
    prompt += `2. Compelling meta description (120-160 characters)\n`;
    prompt += `3. Suggested H1 and heading structure\n`;
    prompt += `4. Open Graph and Twitter Card meta tags\n`;

    return prompt;
  }

  /**
   * Generate GEO (AI Optimization) prompt
   */
  private generateGEOPrompt(results: AnalysisResult[], url: string): string {
    let prompt = `## GEO (Generative Engine Optimization) for ${url}\n\n`;
    prompt += `Help me optimize this content for AI answer engines like ChatGPT, Perplexity, and Google SGE.\n\n`;

    results.forEach((result) => {
      prompt += `### ${result.name} (Score: ${result.score}/${result.maxScore})\n`;
      result.recommendations.forEach((rec) => {
        prompt += `- ${rec}\n`;
      });
      prompt += '\n';
    });

    prompt += `### Request\n`;
    prompt += `Please provide:\n`;
    prompt += `1. 3-5 quotable snippets (40-200 characters each) that AI can cite\n`;
    prompt += `2. FAQ schema JSON-LD with 5 relevant questions\n`;
    prompt += `3. Key definitions in "X is..." format\n`;
    prompt += `4. Statistics or data points to include\n`;
    prompt += `5. HowTo schema if applicable\n`;

    return prompt;
  }

  /**
   * Generate CORE analysis prompt
   */
  private generateCOREPrompt(results: AnalysisResult[], url: string): string {
    let prompt = `## CORE Content Optimization for ${url}\n\n`;
    prompt += `Help me improve the CORE elements: Contextual Clarity, Organization, Referenceability, and Exclusivity.\n\n`;

    results.forEach((result) => {
      prompt += `### ${result.name} (Score: ${result.score}/${result.maxScore})\n`;
      result.recommendations.forEach((rec) => {
        prompt += `- ${rec}\n`;
      });
      prompt += '\n';
    });

    prompt += `### Request\n`;
    prompt += `Please provide:\n`;
    prompt += `1. A clear topic statement for the introduction\n`;
    prompt += `2. Suggested table of contents structure\n`;
    prompt += `3. Key terms to define clearly\n`;
    prompt += `4. Unique value propositions to highlight\n`;
    prompt += `5. Sources to cite for referenceability\n`;

    return prompt;
  }

  /**
   * Generate E-E-A-T prompt
   */
  private generateEEATPrompt(results: AnalysisResult[], url: string): string {
    let prompt = `## E-E-A-T Enhancement for ${url}\n\n`;
    prompt += `Help me strengthen Experience, Expertise, Authoritativeness, and Trust signals.\n\n`;

    results.forEach((result) => {
      prompt += `### ${result.name} (Score: ${result.score}/${result.maxScore})\n`;
      result.recommendations.forEach((rec) => {
        prompt += `- ${rec}\n`;
      });
      prompt += '\n';
    });

    prompt += `### Request\n`;
    prompt += `Please provide:\n`;
    prompt += `1. Author bio template with credentials\n`;
    prompt += `2. First-person experience statements to add\n`;
    prompt += `3. Trust signals to implement (contact, privacy, etc.)\n`;
    prompt += `4. Expert quotes or citations to include\n`;
    prompt += `5. Schema markup for author/organization\n`;

    return prompt;
  }

  /**
   * Generate Technical SEO prompt
   */
  private generateTechnicalPrompt(
    results: AnalysisResult[],
    url: string
  ): string {
    let prompt = `## Technical SEO Fixes for ${url}\n\n`;
    prompt += `Help me resolve these technical SEO issues.\n\n`;

    results.forEach((result) => {
      prompt += `### ${result.name} (Score: ${result.score}/${result.maxScore})\n`;
      result.details.forEach((detail) => {
        prompt += `- ${detail}\n`;
      });
      prompt += `\n**Fixes needed:**\n`;
      result.recommendations.forEach((rec) => {
        prompt += `- ${rec}\n`;
      });
      prompt += '\n';
    });

    prompt += `### Request\n`;
    prompt += `Please provide:\n`;
    prompt += `1. Exact HTML/meta tags to add or modify\n`;
    prompt += `2. robots.txt recommendations if applicable\n`;
    prompt += `3. Performance optimization suggestions\n`;
    prompt += `4. Mobile-friendly improvements\n`;
    prompt += `5. Structured data JSON-LD to implement\n`;

    return prompt;
  }

  /**
   * Generate a single consolidated prompt for all issues
   */
  generateConsolidatedPrompt(results: AnalysisResult[], url: string): string {
    const criticalIssues = results.filter((r) => r.severity === 'critical');
    const warningIssues = results.filter((r) => r.severity === 'warning');

    let prompt = `# SEO & GEO Optimization Analysis for ${url}\n\n`;
    prompt += `Analyze this webpage and provide optimization recommendations.\n\n`;

    prompt += `## Current Analysis Results\n\n`;

    prompt += `### Critical Issues (${criticalIssues.length})\n`;
    criticalIssues.forEach((issue) => {
      prompt += `- **${issue.name}** [${issue.category}]: Score ${issue.score}/${issue.maxScore}\n`;
      prompt += `  - ${issue.recommendations.join('; ')}\n`;
    });

    prompt += `\n### Warnings (${warningIssues.length})\n`;
    warningIssues.slice(0, 10).forEach((issue) => {
      prompt += `- **${issue.name}** [${issue.category}]: Score ${issue.score}/${issue.maxScore}\n`;
    });

    prompt += `\n## Requested Output\n\n`;
    prompt += `Please provide a comprehensive optimization plan including:\n\n`;
    prompt += `1. **Immediate Actions** (Critical fixes)\n`;
    prompt += `   - Exact HTML/meta tags to implement\n`;
    prompt += `   - Content changes needed\n\n`;
    prompt += `2. **GEO Optimization** (AI visibility)\n`;
    prompt += `   - Quotable snippets\n`;
    prompt += `   - FAQ schema\n`;
    prompt += `   - Key definitions\n\n`;
    prompt += `3. **E-E-A-T Improvements**\n`;
    prompt += `   - Author credentials\n`;
    prompt += `   - Trust signals\n`;
    prompt += `   - Experience indicators\n\n`;
    prompt += `4. **Technical Fixes**\n`;
    prompt += `   - Performance improvements\n`;
    prompt += `   - Mobile optimization\n`;
    prompt += `   - Structured data\n`;

    return prompt;
  }

  /**
   * Generate a prompt for specific category only
   */
  generateForCategory(
    results: AnalysisResult[],
    category: AnalysisCategory,
    url: string
  ): string {
    const categoryResults = results.filter((r) => r.category === category);
    return this.generateCategoryPrompt(category, categoryResults, url) ?? '';
  }
}
