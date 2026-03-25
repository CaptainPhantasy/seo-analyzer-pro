/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import type {
  AnalysisResult,
  CategoryScore,
  ScoringWeights,
  AnalysisCategory,
} from '@seo-analyzer-pro/types';
import { DEFAULT_SCORING_WEIGHTS } from '@seo-analyzer-pro/types';

/**
 * Score Calculator
 * Calculates weighted scores across all analysis categories
 */
export class ScoreCalculator {
  private weights: ScoringWeights;

  constructor(customWeights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_SCORING_WEIGHTS, ...customWeights };
  }

  /**
   * Calculate scores for each category
   */
  calculateCategoryScores(
    resultsByCategory: Partial<Record<AnalysisCategory, AnalysisResult[]>>,
    weights?: ScoringWeights
  ): CategoryScore[] {
    const effectiveWeights = weights ?? this.weights;
    const categories: CategoryScore[] = [];

    const categoryEntries = Object.entries(resultsByCategory) as Array<
      [AnalysisCategory, AnalysisResult[]]
    >;

    for (const [category, results] of categoryEntries) {
      const categoryScore = this.calculateCategoryScore(results);
      const weight = effectiveWeights[category] ?? 0;
      const weightedScore = categoryScore * weight;

      categories.push({
        category,
        score: categoryScore,
        maxScore: 100,
        percentage: categoryScore,
        weight,
        weightedScore,
        results,
      });
    }

    return categories;
  }

  /**
   * Calculate overall score from category scores
   */
  calculateOverallScore(categories: CategoryScore[]): number {
    const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
    
    if (totalWeight === 0) {
      return 0;
    }

    const weightedSum = categories.reduce(
      (sum, cat) => sum + cat.weightedScore,
      0
    );

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculate score for a single category
   */
  calculateCategoryScore(results: AnalysisResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    
    if (totalWeight === 0) {
      return 0;
    }

    const weightedSum = results.reduce(
      (sum, r) => sum + (r.score / r.maxScore) * 100 * r.weight,
      0
    );

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Get grade based on score
   */
  getGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Get score label
   */
  getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Improvement';
    if (score >= 40) return 'Poor';
    return 'Critical';
  }

  /**
   * Calculate GEO-specific score (weighted toward GEO factors)
   */
  calculateGEOScore(
    geoResults: AnalysisResult[],
    coreResults: AnalysisResult[]
  ): number {
    const geoScore = this.calculateCategoryScore(geoResults);
    const coreScore = this.calculateCategoryScore(coreResults);

    // GEO score is 70% GEO analyzer, 30% CORE analyzer
    return Math.round(geoScore * 0.7 + coreScore * 0.3);
  }

  /**
   * Calculate traditional SEO score
   */
  calculateSEOScore(
    onpageResults: AnalysisResult[],
    technicalResults: AnalysisResult[]
  ): number {
    const onpageScore = this.calculateCategoryScore(onpageResults);
    const technicalScore = this.calculateCategoryScore(technicalResults);

    // SEO score is 60% on-page, 40% technical
    return Math.round(onpageScore * 0.6 + technicalScore * 0.4);
  }

  /**
   * Get top issues by impact
   */
  getTopIssues(
    results: AnalysisResult[],
    limit: number = 10
  ): AnalysisResult[] {
    return results
      .filter((r) => r.severity === 'critical' || r.severity === 'warning')
      .sort((a, b) => {
        // Sort by severity first, then by score gap
        const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
        const severityDiff =
          severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;

        const aGap = a.maxScore - a.score;
        const bGap = b.maxScore - b.score;
        return bGap - aGap;
      })
      .slice(0, limit);
  }

  /**
   * Get score distribution
   */
  getScoreDistribution(results: AnalysisResult[]): {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  } {
    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };

    for (const result of results) {
      const percentage = (result.score / result.maxScore) * 100;
      
      if (percentage >= 80) {
        distribution.excellent++;
      } else if (percentage >= 60) {
        distribution.good++;
      } else if (percentage >= 40) {
        distribution.fair++;
      } else {
        distribution.poor++;
      }
    }

    return distribution;
  }

  /**
   * Update weights
   */
  updateWeights(newWeights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * Get current weights
   */
  getWeights(): ScoringWeights {
    return { ...this.weights };
  }
}
