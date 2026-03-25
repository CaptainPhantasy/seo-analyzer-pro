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
  calculatePercentage,
  getSeverityFromScore,
  generateResultId,
} from '../types.js';

/**
 * E-E-A-T Analyzer
 * Analyzes Experience, Expertise, Authoritativeness, and Trust
 */
export class EEATAnalyzer implements BaseAnalyzer {
  readonly category: AnalysisCategory = 'eeat';

  async analyze(input: {
    document: Document;
    url: string;
  }): Promise<AnalysisResult[]> {
    const { document } = input;

    return [
      this.analyzeExperience(document),
      this.analyzeExpertise(document),
      this.analyzeAuthoritativeness(document),
      this.analyzeTrust(document),
    ];
  }

  /**
   * Analyze Experience
   * Does the content demonstrate first-hand experience?
   */
  private analyzeExperience(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const bodyText = document.body?.textContent ?? '';

    // Check for first-person content
    const firstPersonPatterns = [
      /\bI\s+(have|had|found|discovered|learned|tested|tried|used|built|created|developed)\b/gi,
      /\bmy\s+(experience|research|analysis|findings|results|testing)\b/gi,
      /\bwe\s+(have|found|discovered|tested|built|created)\b/gi,
      /\bour\s+(experience|research|team|analysis)\b/gi,
    ];

    let firstPersonMatches = 0;
    firstPersonPatterns.forEach((pattern) => {
      const matches = bodyText.match(pattern);
      if (matches) {
        firstPersonMatches += matches.length;
      }
    });

    if (firstPersonMatches >= 5) {
      score += 30;
      details.push('Strong first-person experience indicators');
    } else if (firstPersonMatches >= 2) {
      score += 20;
      details.push('Some first-person experience indicators');
    } else {
      recommendations.push('Add first-person accounts of your experience with the topic');
    }

    // Check for practical examples
    const examplePatterns = [
      /for example/i,
      /for instance/i,
      /in practice/i,
      /in our testing/i,
      /when we tested/i,
      /in my experience/i,
      /here's how/i,
      /step by step/i,
    ];

    const exampleMatches = examplePatterns.filter((pattern) => pattern.test(bodyText));
    if (exampleMatches.length >= 3) {
      score += 25;
      details.push('Multiple practical examples found');
    } else if (exampleMatches.length >= 1) {
      score += 15;
      details.push('Some practical examples found');
    } else {
      recommendations.push('Include practical, real-world examples');
    }

    // Check for case studies
    const caseStudyPatterns = [
      /case study/i,
      /case studies/i,
      /real world/i,
      /real-world/i,
      /success story/i,
      /customer story/i,
      /client example/i,
    ];

    const hasCaseStudies = caseStudyPatterns.some((pattern) => pattern.test(bodyText));
    if (hasCaseStudies) {
      score += 25;
      details.push('Case studies or real-world examples found');
    } else {
      recommendations.push('Add case studies demonstrating real-world application');
    }

    // Check for testimonials/reviews
    const testimonialPatterns = [
      /testimonial/i,
      /what (our|people|users|customers) say/i,
      /customer review/i,
      /user feedback/i,
      /rated/i,
    ];

    const hasTestimonials = testimonialPatterns.some((pattern) => pattern.test(bodyText));
    const testimonialElements = document.querySelectorAll(
      '[class*="testimonial"], [class*="review"], [itemprop="review"]'
    );

    if (hasTestimonials || testimonialElements.length > 0) {
      score += 20;
      details.push('Testimonials or reviews found');
    } else {
      recommendations.push('Include testimonials or user feedback');
    }

    return {
      id: generateResultId(this.category, 'Experience'),
      name: 'Experience',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.2,
      description: 'Analyzes demonstration of first-hand experience',
      details,
      recommendations,
      rawData: {
        firstPersonMatches,
        exampleMatches: exampleMatches.length,
        hasCaseStudies,
        hasTestimonials,
      },
    };
  }

  /**
   * Analyze Expertise
   * Does the content demonstrate expertise?
   */
  private analyzeExpertise(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for author credentials
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '.author-name',
      '[class*="author"]',
      'meta[name="author"]',
    ];

    let hasAuthor = false;
    let authorText = '';

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        if (element.tagName === 'META') {
          authorText = (element as HTMLMetaElement).content ?? '';
        } else {
          authorText = extractTextContent(element);
        }
        if (authorText.length > 0) {
          hasAuthor = true;
          break;
        }
      }
    }

    if (hasAuthor) {
      score += 20;
      details.push(`Author identified: ${authorText}`);
    } else {
      recommendations.push('Add author attribution to your content');
    }

    // Check for author bio/link
    const authorBioSelectors = [
      '.author-bio',
      '.author-description',
      '[class*="author-bio"]',
      'a[href*="author"]',
    ];

    const hasAuthorBio = authorBioSelectors.some((selector) => {
      const element = document.querySelector(selector);
      return element !== null;
    });

    if (hasAuthorBio) {
      score += 20;
      details.push('Author bio found');
    } else if (hasAuthor) {
      recommendations.push('Add an author bio with credentials');
    }

    // Check for credentials in content
    const bodyText = document.body?.textContent ?? '';
    const credentialPatterns = [
      /\bPhD\b/i,
      /\bM\.?D\.?\b/i,
      /\bM\.?S\.?\b/i,
      /\bM\.?B\.?A\.?\b/i,
      /\bB\.?S\.?\b/i,
      /\bcertified\b/i,
      /\bexpert\b/i,
      /\bspecialist\b/i,
      /\bprofessional\b/i,
      /\byears of experience\b/i,
      /\bdecades of experience\b/i,
    ];

    const credentialMatches = credentialPatterns.filter((pattern) => pattern.test(bodyText));
    if (credentialMatches.length >= 2) {
      score += 25;
      details.push('Professional credentials mentioned');
    } else if (credentialMatches.length >= 1) {
      score += 15;
      details.push('Some credentials mentioned');
    } else {
      recommendations.push('Include author credentials and qualifications');
    }

    // Check for citations and references
    const citations = document.querySelectorAll('cite, .citation, a[href*="scholar"], a[href*="doi"]');

    if (citations.length >= 3) {
      score += 20;
      details.push(`${citations.length} citations found`);
    } else if (citations.length >= 1) {
      score += 10;
    } else {
      recommendations.push('Add citations to authoritative sources');
    }

    // Check for technical depth
    const technicalIndicators = [
      /according to/i,
      /research shows/i,
      /studies indicate/i,
      /data suggests/i,
      /analysis reveals/i,
      /our findings/i,
    ];

    const technicalMatches = technicalIndicators.filter((pattern) => pattern.test(bodyText));
    if (technicalMatches.length >= 2) {
      score += 15;
      details.push('Technical depth indicators found');
    }

    return {
      id: generateResultId(this.category, 'Expertise'),
      name: 'Expertise',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.3,
      description: 'Analyzes demonstration of expertise',
      details,
      recommendations,
      rawData: {
        hasAuthor,
        hasAuthorBio,
        credentialMatches: credentialMatches.length,
        citationsCount: citations.length,
      },
    };
  }

  /**
   * Analyze Authoritativeness
   * Is the content/author recognized as authoritative?
   */
  private analyzeAuthoritativeness(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    const bodyText = document.body?.textContent ?? '';

    // Check for social proof
    const socialProofPatterns = [
      /as seen (in|on)/i,
      /featured (in|on)/i,
      /mentioned (in|on)/i,
      /quoted (in|on)/i,
      /published (in|on)/i,
    ];

    const socialProofMatches = socialProofPatterns.filter((pattern) => pattern.test(bodyText));
    if (socialProofMatches.length >= 2) {
      score += 25;
      details.push('Media mentions found');
    } else if (socialProofMatches.length >= 1) {
      score += 15;
      details.push('Some media mentions');
    } else {
      recommendations.push('Add media mentions or "as seen in" indicators');
    }

    // Check for awards and recognition
    const awardPatterns = [
      /award/i,
      /winner/i,
      /recognized/i,
      /honored/i,
      /nominated/i,
      /top\s+\d+/i,
      /best\s+\d+/i,
    ];

    const awardMatches = awardPatterns.filter((pattern) => pattern.test(bodyText));
    if (awardMatches.length >= 1) {
      score += 20;
      details.push('Awards or recognition mentioned');
    } else {
      recommendations.push('Highlight any awards or industry recognition');
    }

    // Check for certifications
    const certPatterns = [
      /certified/i,
      /accredited/i,
      /verified/i,
      /approved/i,
      /licensed/i,
      /registered/i,
    ];

    const certMatches = certPatterns.filter((pattern) => pattern.test(bodyText));
    if (certMatches.length >= 1) {
      score += 20;
      details.push('Certifications or accreditations found');
    }

    // Check for partnerships/associations
    const partnershipPatterns = [
      /partner/i,
      /association/i,
      /member (of|in)/i,
      /affiliated/i,
      /collaboration/i,
    ];

    const partnershipMatches = partnershipPatterns.filter((pattern) => pattern.test(bodyText));
    if (partnershipMatches.length >= 1) {
      score += 15;
      details.push('Partnerships or associations mentioned');
    }

    // Check for schema.org Organization/Person data
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    let hasOrganizationSchema = false;
    let hasPersonSchema = false;

    scripts.forEach((script) => {
      try {
        const content = script.textContent ?? '';
        const json = JSON.parse(content) as { '@type'?: string };
        if (json['@type'] === 'Organization') hasOrganizationSchema = true;
        if (json['@type'] === 'Person') hasPersonSchema = true;
      } catch {
        // Invalid JSON
      }
    });

    if (hasOrganizationSchema || hasPersonSchema) {
      score += 20;
      details.push('Authoritative schema markup found');
    }

    return {
      id: generateResultId(this.category, 'Authoritativeness'),
      name: 'Authoritativeness',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.2,
      description: 'Analyzes authoritativeness signals',
      details,
      recommendations,
      rawData: {
        socialProofMatches: socialProofMatches.length,
        awardMatches: awardMatches.length,
        certMatches: certMatches.length,
        hasOrganizationSchema,
        hasPersonSchema,
      },
    };
  }

  /**
   * Analyze Trust
   * Is the content/site trustworthy?
   */
  private analyzeTrust(document: Document): AnalysisResult {
    let score = 0;
    const maxScore = 100;
    const details: string[] = [];
    const recommendations: string[] = [];

    // Check for contact information
    const contactSelectors = [
      'a[href^="mailto:"]',
      'a[href^="tel:"]',
      '.contact',
      '[class*="contact"]',
      'address',
    ];

    const hasContact = contactSelectors.some((selector) => {
      return document.querySelector(selector) !== null;
    });

    if (hasContact) {
      score += 20;
      details.push('Contact information found');
    } else {
      recommendations.push('Add contact information');
    }

    // Check for privacy policy
    const privacyPatterns = [
      /privacy policy/i,
      /privacy notice/i,
      /data protection/i,
    ];

    const links = Array.from(document.querySelectorAll('a'));
    const hasPrivacyPolicy = links.some((link) => {
      const href = link.getAttribute('href') ?? '';
      const text = extractTextContent(link);
      return privacyPatterns.some((pattern) => pattern.test(href) || pattern.test(text));
    });

    if (hasPrivacyPolicy) {
      score += 15;
      details.push('Privacy policy link found');
    } else {
      recommendations.push('Add a privacy policy link');
    }

    // Check for terms of service
    const termsPatterns = [
      /terms of service/i,
      /terms of use/i,
      /terms and conditions/i,
      /user agreement/i,
    ];

    const hasTerms = links.some((link) => {
      const href = link.getAttribute('href') ?? '';
      const text = extractTextContent(link);
      return termsPatterns.some((pattern) => pattern.test(href) || pattern.test(text));
    });

    if (hasTerms) {
      score += 15;
      details.push('Terms of service link found');
    } else {
      recommendations.push('Add terms of service link');
    }

    // Check for about page
    const aboutPatterns = [/about us/i, /about/i, /our story/i, /who we are/i];
    const hasAbout = links.some((link) => {
      const href = link.getAttribute('href') ?? '';
      const text = extractTextContent(link);
      return aboutPatterns.some((pattern) => pattern.test(href) || pattern.test(text));
    });

    if (hasAbout) {
      score += 15;
      details.push('About page link found');
    } else {
      recommendations.push('Add an about page link');
    }

    // Check for secure connection (indicated by canonical or og:url)
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const ogUrl = getMetaContent(document, 'og:url');
    const isSecure = (canonical?.startsWith('https://') ?? false) || 
                     (ogUrl?.startsWith('https://') ?? false);

    if (isSecure) {
      score += 15;
      details.push('Secure connection (HTTPS)');
    }

    // Check for reviews/testimonials
    const reviewElements = document.querySelectorAll(
      '[class*="review"], [class*="testimonial"], [itemprop="review"]'
    );

    if (reviewElements.length >= 3) {
      score += 20;
      details.push(`${reviewElements.length} reviews/testimonials found`);
    } else if (reviewElements.length >= 1) {
      score += 10;
      details.push('Some reviews/testimonials found');
    } else {
      recommendations.push('Add customer reviews or testimonials');
    }

    return {
      id: generateResultId(this.category, 'Trust'),
      name: 'Trust',
      category: this.category,
      severity: getSeverityFromScore(calculatePercentage(score, maxScore)),
      score,
      maxScore,
      weight: 1.3,
      description: 'Analyzes trust signals',
      details,
      recommendations,
      rawData: {
        hasContact,
        hasPrivacyPolicy,
        hasTerms,
        hasAbout,
        isSecure,
        reviewCount: reviewElements.length,
      },
    };
  }
}
