/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

// Internal types for analyzer-core
import type {
  AnalysisResult,
  Severity,
  AnalysisCategory,
} from '@seo-analyzer-pro/types';

export type { AnalysisResult, Severity, AnalysisCategory };

/**
 * DOM parser result
 */
export interface ParsedDocument {
  document: Document;
  url: string;
}

/**
 * Base analyzer interface
 */
export interface BaseAnalyzer {
  analyze(input: { document: Document; url: string }): Promise<AnalysisResult[]>;
  readonly category: AnalysisCategory;
}

/**
 * Text content extraction helper
 */
export function extractTextContent(element: Element | null): string {
  if (!element) return '';
  return element.textContent?.trim() ?? '';
}

/**
 * Meta tag extraction helper
 */
export function getMetaContent(document: Document, name: string): string | null {
  const meta = document.querySelector(
    `meta[name="${name}"], meta[property="${name}"]`
  );
  return meta?.getAttribute('content')?.trim() ?? null;
}

/**
 * Check if text has optimal length
 */
export function isOptimalLength(
  text: string,
  min: number,
  max: number
): boolean {
  const len = text.length;
  return len >= min && len <= max;
}

/**
 * Calculate percentage score
 */
export function calculatePercentage(score: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((score / max) * 100);
}

/**
 * Determine severity based on score percentage
 */
export function getSeverityFromScore(percentage: number): Severity {
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'info';
  if (percentage >= 40) return 'warning';
  return 'critical';
}

/**
 * Generate unique ID for analysis result
 */
export function generateResultId(category: string, name: string): string {
  return `${category}-${name.toLowerCase().replace(/\s+/g, '-')}`;
}
