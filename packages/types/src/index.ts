/**
 * SEO Analyzer Pro - Enterprise SEO & GEO Analysis Platform
 * Copyright (c) 2026 Legacy AI / Floyd's Labs
 * www.LegacyAI.space | www.FloydsLabs.com
 */

// ============================================================================
// Core Analysis Types
// ============================================================================

/**
 * Severity level for analysis issues
 */
export type Severity = 'critical' | 'warning' | 'info' | 'success';

/**
 * Category of SEO analysis
 */
export type AnalysisCategory =
  | 'onpage'
  | 'geo'
  | 'core'
  | 'eeat'
  | 'technical';

/**
 * Individual analysis result for a single check
 */
export interface AnalysisResult {
  /** Unique identifier for this check */
  id: string;
  /** Human-readable check name */
  name: string;
  /** Category this check belongs to */
  category: AnalysisCategory;
  /** Severity of the result */
  severity: Severity;
  /** Score for this check (0-100) */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Weight in overall calculation */
  weight: number;
  /** Human-readable description */
  description: string;
  /** Specific details about what was found */
  details: string[];
  /** Recommendations for improvement */
  recommendations: string[];
  /** Raw data extracted during analysis */
  rawData?: Record<string, unknown>;
}

/**
 * Score breakdown by category
 */
export interface CategoryScore {
  category: AnalysisCategory;
  score: number;
  maxScore: number;
  percentage: number;
  weight: number;
  weightedScore: number;
  results: AnalysisResult[];
}

/**
 * Complete analysis report
 */
export interface AnalysisReport {
  /** URL that was analyzed */
  url: string;
  /** Timestamp of analysis */
  timestamp: Date;
  /** Overall score (0-100) */
  overallScore: number;
  /** GEO-specific score for AI optimization */
  geoScore: number;
  /** Traditional SEO score */
  seoScore: number;
  /** Score breakdown by category */
  categories: CategoryScore[];
  /** All individual results */
  results: AnalysisResult[];
  /** Generated action items */
  actionItems: ActionItem[];
  /** LLM prompts for AI assistants */
  llmPrompts: string[];
}

// ============================================================================
// On-Page Analysis Types
// ============================================================================

/**
 * Title tag analysis data
 */
export interface TitleAnalysis {
  exists: boolean;
  content: string;
  length: number;
  optimalLength: boolean;
  hasKeywords: boolean;
  isUnique: boolean | null;
}

/**
 * Meta description analysis data
 */
export interface MetaDescriptionAnalysis {
  exists: boolean;
  content: string;
  length: number;
  optimalLength: boolean;
  hasKeywords: boolean;
  isCompelling: boolean;
}

/**
 * Heading structure analysis
 */
export interface HeadingAnalysis {
  h1: HeadingInfo;
  h2: HeadingInfo[];
  h3: HeadingInfo[];
  h4: HeadingInfo[];
  h5: HeadingInfo[];
  h6: HeadingInfo[];
  structure: HeadingStructure;
}

export interface HeadingInfo {
  content: string;
  count: number;
  items: string[];
}

export interface HeadingStructure {
  hasH1: boolean;
  singleH1: boolean;
  hierarchicalOrder: boolean;
  skippedLevels: number[];
}

/**
 * Image analysis data
 */
export interface ImageAnalysis {
  totalImages: number;
  withAlt: number;
  withoutAlt: number;
  withEmptyAlt: number;
  altTexts: string[];
  largeImages: string[];
  unoptimizedImages: string[];
}

/**
 * Link analysis data
 */
export interface LinkAnalysis {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: string[];
  nofollowLinks: number;
  sponsoredLinks: number;
  ugcLinks: number;
}

/**
 * Open Graph analysis data
 */
export interface OpenGraphAnalysis {
  hasTitle: boolean;
  hasDescription: boolean;
  hasImage: boolean;
  hasUrl: boolean;
  hasType: boolean;
  complete: boolean;
  title: string | null;
  description: string | null;
  image: string | null;
}

/**
 * Twitter Card analysis data
 */
export interface TwitterCardAnalysis {
  hasCard: boolean;
  cardType: string | null;
  hasTitle: boolean;
  hasDescription: boolean;
  hasImage: boolean;
  complete: boolean;
}

// ============================================================================
// GEO (Generative Engine Optimization) Types
// ============================================================================

/**
 * AI citation optimization analysis
 */
export interface GEOCitationAnalysis {
  hasQuotableContent: boolean;
  quotableSnippets: string[];
  hasStatistics: boolean;
  statistics: string[];
  hasDefinitions: boolean;
  definitions: string[];
  hasExpertQuotes: boolean;
  expertQuotes: string[];
  citationReadiness: number;
}

/**
 * FAQ Schema analysis
 */
export interface FAQSchemaAnalysis {
  hasFAQSchema: boolean;
  faqCount: number;
  questions: string[];
  hasAnswerSchema: boolean;
  schemaValid: boolean;
}

/**
 * Schema.org analysis
 */
export interface SchemaAnalysis {
  hasSchema: boolean;
  types: string[];
  hasOrganization: boolean;
  hasArticle: boolean;
  hasProduct: boolean;
  hasBreadcrumb: boolean;
  hasFAQ: boolean;
  hasHowTo: boolean;
  hasLocalBusiness: boolean;
  schemaErrors: string[];
}

/**
 * Content quotability analysis
 */
export interface QuotabilityAnalysis {
  score: number;
  hasBulletPoints: boolean;
  hasNumberedLists: boolean;
  hasTables: boolean;
  hasPullQuotes: boolean;
  averageSentenceLength: number;
  readabilityScore: number;
  quotableParagraphs: string[];
}

// ============================================================================
// CORE Analysis Types (Contextual Clarity, Organization, Referenceability, Exclusivity)
// ============================================================================

/**
 * Contextual Clarity analysis
 */
export interface ContextualClarityAnalysis {
  score: number;
  hasClearTopic: boolean;
  topicKeywords: string[];
  semanticDensity: number;
  topicConsistency: number;
  ambiguityScore: number;
  contextSignals: string[];
}

/**
 * Organization analysis
 */
export interface OrganizationAnalysis {
  score: number;
  hasTableOfContents: boolean;
  hasClearStructure: boolean;
  sectionCount: number;
  averageSectionLength: number;
  hasIntro: boolean;
  hasConclusion: boolean;
  structureScore: number;
}

/**
 * Referenceability analysis
 */
export interface ReferenceabilityAnalysis {
  score: number;
  hasCitations: boolean;
  citationCount: number;
  hasExternalLinks: boolean;
  externalLinkCount: number;
  hasAuthorInfo: boolean;
  hasPublishDate: boolean;
  hasModifiedDate: boolean;
  trustSignals: string[];
}

/**
 * Exclusivity analysis
 */
export interface ExclusivityAnalysis {
  score: number;
  hasUniqueContent: boolean;
  hasOriginalData: boolean;
  hasExpertInsights: boolean;
  hasCaseStudies: boolean;
  uniqueValuePropositions: string[];
  differentiationScore: number;
}

// ============================================================================
// E-E-A-T Analysis Types
// ============================================================================

/**
 * Experience analysis
 */
export interface ExperienceAnalysis {
  score: number;
  hasFirstPersonContent: boolean;
  hasPracticalExamples: boolean;
  hasCaseStudies: boolean;
  hasTestimonials: boolean;
  hasUserGeneratedContent: boolean;
  experienceSignals: string[];
}

/**
 * Expertise analysis
 */
export interface ExpertiseAnalysis {
  score: number;
  hasAuthorCredentials: boolean;
  hasAuthorBio: boolean;
  hasExpertQuotes: boolean;
  hasTechnicalDepth: boolean;
  hasCitations: boolean;
  expertiseSignals: string[];
}

/**
 * Authoritativeness analysis
 */
export interface AuthoritativenessAnalysis {
  score: number;
  hasBacklinks: boolean | null;
  hasSocialProof: boolean;
  hasMentions: boolean;
  hasAwards: boolean;
  hasCertifications: boolean;
  domainAuthority: number | null;
  authoritySignals: string[];
}

/**
 * Trust analysis
 */
export interface TrustAnalysis {
  score: number;
  hasContactInfo: boolean;
  hasPrivacyPolicy: boolean;
  hasTermsOfService: boolean;
  hasAboutPage: boolean;
  hasSecureConnection: boolean;
  hasReviews: boolean;
  trustSignals: string[];
}

// ============================================================================
// Technical SEO Types
// ============================================================================

/**
 * Robots.txt analysis
 */
export interface RobotsAnalysis {
  exists: boolean;
  allowsAll: boolean;
  blockedPaths: string[];
  hasSitemap: boolean;
  sitemapUrl: string | null;
  errors: string[];
}

/**
 * Viewport and mobile analysis
 */
export interface ViewportAnalysis {
  hasViewport: boolean;
  isResponsive: boolean;
  viewportContent: string | null;
  mobileFriendly: boolean;
}

/**
 * Character encoding analysis
 */
export interface CharsetAnalysis {
  hasCharset: boolean;
  charset: string | null;
  isUTF8: boolean;
}

/**
 * Performance analysis
 */
export interface PerformanceAnalysis {
  loadTime: number | null;
  pageSize: number | null;
  requestCount: number | null;
  hasLazyLoading: boolean;
  hasAsyncScripts: boolean;
  hasDeferredScripts: boolean;
  hasPreconnect: boolean;
  hasPreload: boolean;
}

/**
 * Core Web Vitals data
 */
export interface CoreWebVitals {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
}

// ============================================================================
// Action Items & Recommendations
// ============================================================================

/**
 * Priority level for action items
 */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Action item for improvement
 */
export interface ActionItem {
  id: string;
  priority: Priority;
  category: AnalysisCategory;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  relatedResults: string[];
  llmInstruction: string;
  implementation: string;
}

// ============================================================================
// Scoring Types
// ============================================================================

/**
 * Scoring weights configuration
 */
export interface ScoringWeights {
  onpage: number;
  geo: number;
  core: number;
  eeat: number;
  technical: number;
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  onpage: 0.25,
  geo: 0.25,
  core: 0.20,
  eeat: 0.15,
  technical: 0.15,
};

// ============================================================================
// Input Types
// ============================================================================

/**
 * Raw HTML content input
 */
export interface HTMLInput {
  html: string;
  url: string;
}

/**
 * Parsed DOM input
 */
export interface DOMInput {
  document: Document;
  url: string;
}

/**
 * Analysis input (can be HTML string or DOM)
 */
export type AnalysisInput = HTMLInput | DOMInput;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extracts the HTML string from input
 */
export function isHTMLInput(input: AnalysisInput): input is HTMLInput {
  return typeof (input as HTMLInput).html === 'string';
}

/**
 * Extracts the DOM document from input
 */
export function isDOMInput(input: AnalysisInput): input is DOMInput {
  return (input as DOMInput).document instanceof Document;
}
