/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Score Display Components Types
// ============================================================================

export interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
}

export interface CategoryScoreCardProps {
  category: string;
  score: number;
  maxScore: number;
  results: Array<{
    name: string;
    score: number;
    severity: string;
  }>;
}

// ============================================================================
// Analysis Display Components Types
// ============================================================================

export interface AnalysisResultItemProps {
  name: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  score: number;
  maxScore: number;
  description: string;
  details: string[];
  recommendations: string[];
}

export interface ActionItemCardProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  category: string;
}

// ============================================================================
// Chart Components Types
// ============================================================================

export interface ScoreChartProps {
  categories: Array<{
    name: string;
    score: number;
    color?: string;
  }>;
  size?: number;
}

export interface RadarChartProps {
  data: Array<{
    category: string;
    value: number;
    fullMark: number;
  }>;
  size?: number;
}

// ============================================================================
// Export Constants
// ============================================================================

export const SEVERITY_COLORS = {
  critical: {
    bg: 'bg-red-500',
    text: 'text-red-500',
    border: 'border-red-500',
    light: 'bg-red-50',
  },
  warning: {
    bg: 'bg-amber-500',
    text: 'text-amber-500',
    border: 'border-amber-500',
    light: 'bg-amber-50',
  },
  info: {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    border: 'border-blue-500',
    light: 'bg-blue-50',
  },
  success: {
    bg: 'bg-green-500',
    text: 'text-green-500',
    border: 'border-green-500',
    light: 'bg-green-50',
  },
} as const;

export const PRIORITY_COLORS = {
  critical: {
    bg: 'bg-red-600',
    text: 'text-red-600',
    border: 'border-red-600',
  },
  high: {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    border: 'border-orange-500',
  },
  medium: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    border: 'border-yellow-500',
  },
  low: {
    bg: 'bg-gray-400',
    text: 'text-gray-400',
    border: 'border-gray-400',
  },
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  onpage: 'On-Page SEO',
  geo: 'GEO (AI Optimization)',
  core: 'CORE Analysis',
  eeat: 'E-E-A-T',
  technical: 'Technical SEO',
};

export const EFFORT_LABELS: Record<string, string> = {
  low: 'Quick Fix',
  medium: 'Moderate Effort',
  high: 'Significant Effort',
};
