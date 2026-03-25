/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { OnPageAnalyzer } from './analyzers/onpage.js';
import { GEOAnalyzer } from './analyzers/geo.js';
import { COREAnalyzer } from './analyzers/core.js';
import { EEATAnalyzer } from './analyzers/eeat.js';
import { TechnicalAnalyzer } from './analyzers/technical.js';
import { ScoreCalculator } from './scorers/index.js';
import { ActionItemGenerator } from './generators/action-items.js';
import { LLMPromptGenerator } from './generators/llm-prompt.js';

// Re-export types
export type {
  AnalysisReport,
  AnalysisResult,
  AnalysisCategory,
  Severity,
  CategoryScore,
  ActionItem,
  Priority,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  AnalysisInput,
  HTMLInput,
  DOMInput,
  // On-Page types
  TitleAnalysis,
  MetaDescriptionAnalysis,
  HeadingAnalysis,
  HeadingInfo,
  HeadingStructure,
  ImageAnalysis,
  LinkAnalysis,
  OpenGraphAnalysis,
  TwitterCardAnalysis,
  // GEO types
  GEOCitationAnalysis,
  FAQSchemaAnalysis,
  SchemaAnalysis,
  QuotabilityAnalysis,
  // CORE types
  ContextualClarityAnalysis,
  OrganizationAnalysis,
  ReferenceabilityAnalysis,
  ExclusivityAnalysis,
  // E-E-A-T types
  ExperienceAnalysis,
  ExpertiseAnalysis,
  AuthoritativenessAnalysis,
  TrustAnalysis,
  // Technical types
  RobotsAnalysis,
  ViewportAnalysis,
  CharsetAnalysis,
  PerformanceAnalysis,
  CoreWebVitals,
} from '@seo-analyzer-pro/types';

export { isHTMLInput, isDOMInput } from '@seo-analyzer-pro/types';

// Export analyzers
export { OnPageAnalyzer } from './analyzers/onpage.js';
export { GEOAnalyzer } from './analyzers/geo.js';
export { COREAnalyzer } from './analyzers/core.js';
export { EEATAnalyzer } from './analyzers/eeat.js';
export { TechnicalAnalyzer } from './analyzers/technical.js';

// Export scorers and generators
export { ScoreCalculator } from './scorers/index.js';
export { ActionItemGenerator } from './generators/action-items.js';
export { LLMPromptGenerator } from './generators/llm-prompt.js';

import type {
  AnalysisReport,
  AnalysisInput,
  ScoringWeights,
} from '@seo-analyzer-pro/types';
import { DEFAULT_SCORING_WEIGHTS as weights } from '@seo-analyzer-pro/types';

/**
 * Main SEO Analyzer class
 * Orchestrates all analyzers and generates comprehensive reports
 */
export class SEOAnalyzer {
  private onpageAnalyzer: OnPageAnalyzer;
  private geoAnalyzer: GEOAnalyzer;
  private coreAnalyzer: COREAnalyzer;
  private eeatAnalyzer: EEATAnalyzer;
  private technicalAnalyzer: TechnicalAnalyzer;
  private scoreCalculator: ScoreCalculator;
  private actionItemGenerator: ActionItemGenerator;
  private llmPromptGenerator: LLMPromptGenerator;
  private weights: ScoringWeights;

  constructor(customWeights?: Partial<ScoringWeights>) {
    this.onpageAnalyzer = new OnPageAnalyzer();
    this.geoAnalyzer = new GEOAnalyzer();
    this.coreAnalyzer = new COREAnalyzer();
    this.eeatAnalyzer = new EEATAnalyzer();
    this.technicalAnalyzer = new TechnicalAnalyzer();
    this.scoreCalculator = new ScoreCalculator();
    this.actionItemGenerator = new ActionItemGenerator();
    this.llmPromptGenerator = new LLMPromptGenerator();
    this.weights = { ...weights, ...customWeights };
  }

  /**
   * Analyze a webpage and generate a comprehensive report
   */
  async analyze(input: AnalysisInput): Promise<AnalysisReport> {
    const { document, url } = await this.parseInput(input);

    // Run all analyzers in parallel
    const [onpageResults, geoResults, coreResults, eeatResults, technicalResults] =
      await Promise.all([
        this.onpageAnalyzer.analyze({ document, url }),
        this.geoAnalyzer.analyze({ document, url }),
        this.coreAnalyzer.analyze({ document, url }),
        this.eeatAnalyzer.analyze({ document, url }),
        this.technicalAnalyzer.analyze({ document, url }),
      ]);

    // Combine all results
    const allResults = [
      ...onpageResults,
      ...geoResults,
      ...coreResults,
      ...eeatResults,
      ...technicalResults,
    ];

    // Calculate scores
    const categoryScores = this.scoreCalculator.calculateCategoryScores(
      {
        onpage: onpageResults,
        geo: geoResults,
        core: coreResults,
        eeat: eeatResults,
        technical: technicalResults,
      },
      this.weights
    );

    const overallScore = this.scoreCalculator.calculateOverallScore(categoryScores);
    const geoScore = this.scoreCalculator.calculateCategoryScore(geoResults);
    const seoScore = this.scoreCalculator.calculateCategoryScore([
      ...onpageResults,
      ...technicalResults,
    ]);

    // Generate action items
    const actionItems = this.actionItemGenerator.generate(allResults);

    // Generate LLM prompts
    const llmPrompts = this.llmPromptGenerator.generate(allResults, url);

    return {
      url,
      timestamp: new Date(),
      overallScore,
      geoScore,
      seoScore,
      categories: categoryScores,
      results: allResults,
      actionItems,
      llmPrompts,
    };
  }

  /**
   * Analyze only specific categories
   */
  async analyzeCategories(
    input: AnalysisInput,
    categories: Array<'onpage' | 'geo' | 'core' | 'eeat' | 'technical'>
  ): Promise<AnalysisReport> {
    const { document, url } = await this.parseInput(input);

    const analyzerMap = {
      onpage: this.onpageAnalyzer,
      geo: this.geoAnalyzer,
      core: this.coreAnalyzer,
      eeat: this.eeatAnalyzer,
      technical: this.technicalAnalyzer,
    };

    const results = await Promise.all(
      categories.map((cat) => analyzerMap[cat].analyze({ document, url }))
    );

    const allResults = results.flat();
    const categoryScores = this.scoreCalculator.calculateCategoryScores(
      Object.fromEntries(
        categories.map((cat, i) => [cat, results[i]])
      ) as Record<string, typeof results[0]>,
      this.weights
    );

    const overallScore = this.scoreCalculator.calculateOverallScore(categoryScores);
    const actionItems = this.actionItemGenerator.generate(allResults);
    const llmPrompts = this.llmPromptGenerator.generate(allResults, url);

    return {
      url,
      timestamp: new Date(),
      overallScore,
      geoScore: categories.includes('geo')
        ? this.scoreCalculator.calculateCategoryScore(results[categories.indexOf('geo')] || [])
        : 0,
      seoScore: this.scoreCalculator.calculateCategoryScore(allResults),
      categories: categoryScores,
      results: allResults,
      actionItems,
      llmPrompts,
    };
  }

  /**
   * Parse input to get document and URL
   */
  private async parseInput(input: AnalysisInput): Promise<{ document: Document; url: string }> {
    if (typeof (input as { html: string }).html === 'string') {
      const { html, url } = input as { html: string; url: string };
      const parser = new DOMParser();
      const document = parser.parseFromString(html, 'text/html');
      return { document, url };
    }
    return input as { document: Document; url: string };
  }
}

/**
 * Create a new SEO Analyzer instance
 */
export function createAnalyzer(customWeights?: Partial<ScoringWeights>): SEOAnalyzer {
  return new SEOAnalyzer(customWeights);
}

// Default export
export default SEOAnalyzer;
