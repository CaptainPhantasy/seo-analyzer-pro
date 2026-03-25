'use client';

import { useState, useRef } from 'react';
import { SEOAnalyzer } from '@seo-analyzer-pro/analyzer-core';
import type { AnalysisReport } from '@seo-analyzer-pro/types';
import { jsPDF } from 'jspdf';
import { LEGACY_AI_LOGO_B64 } from '../lib/logo-b64';
import {
  Globe,
  Search,
  ArrowRight,
  RotateCcw,
  FileDown,
  Copy,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  TrendingUp,
  BarChart3,
  Zap,
  ShieldCheck,
  Bot,
  Target,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
} as const;

function getScoreVariant(score: number): 'success' | 'info' | 'warning' | 'critical' {
  if (score >= SCORE_THRESHOLDS.excellent) return 'success';
  if (score >= SCORE_THRESHOLDS.good) return 'info';
  if (score >= SCORE_THRESHOLDS.fair) return 'warning';
  return 'critical';
}

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'text-emerald-500';
  if (score >= SCORE_THRESHOLDS.good) return 'text-blue-500';
  if (score >= SCORE_THRESHOLDS.fair) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreRingColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'stroke-emerald-500';
  if (score >= SCORE_THRESHOLDS.good) return 'stroke-blue-500';
  if (score >= SCORE_THRESHOLDS.fair) return 'stroke-amber-500';
  return 'stroke-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'Excellent';
  if (score >= SCORE_THRESHOLDS.good) return 'Good';
  if (score >= SCORE_THRESHOLDS.fair) return 'Fair';
  return 'Critical';
}

const PRIORITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    variant: 'critical' as const,
    border: 'border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
  },
  high: {
    icon: AlertTriangle,
    variant: 'warning' as const,
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  medium: {
    icon: Info,
    variant: 'info' as const,
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
  },
  low: {
    icon: CheckCircle2,
    variant: 'success' as const,
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
} as const;

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  onpage: { label: 'On-Page SEO', icon: Target, description: 'Title, meta, headings, content' },
  geo: { label: 'GEO', icon: Bot, description: 'AI engine optimization signals' },
  core: { label: 'Core Web', icon: Zap, description: 'Performance & user experience' },
  eeat: { label: 'E-E-A-T', icon: ShieldCheck, description: 'Expertise, authority, trust' },
  technical: { label: 'Technical', icon: Activity, description: 'Crawlability & structure' },
};

const QUICK_URLS = [
  'https://www.apple.com',
  'https://www.nike.com',
  'https://www.mozilla.org',
  'https://www.vercel.com',
];

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth="8" fill="transparent"
          className="stroke-muted"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth="8" fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-1000 ease-out', getScoreRingColor(score))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-black leading-none', getScoreColor(score), size >= 120 ? 'text-4xl' : 'text-2xl')}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setReport(null);
    try {
      setLoadingStatus('Fetching website content...');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || `Failed to fetch website (${response.status})`);
      }
      const { html, url: finalUrl } = await response.json() as { html: string; url: string };
      setLoadingStatus('Analyzing SEO & GEO metrics...');
      const analyzer = new SEOAnalyzer();
      const analysisReport = await analyzer.analyze({ html, url: finalUrl });
      setReport(analysisReport);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
      setLoadingStatus('');
    }
  };

  const handleReset = () => {
    setReport(null);
    setUrl('');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyLLMPrompt = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.llmPrompts.join('\n\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToPDF = () => {
    if (!report) return;

    // ── Constants ──────────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();   // 210
    const PH = doc.internal.pageSize.getHeight();  // 297
    const ML = 18;   // margin left
    const MR = 18;   // margin right
    const CW = PW - ML - MR; // content width
    const HEADER_H = 12;
    const FOOTER_H = 10;
    const CONTENT_TOP = HEADER_H + 6;
    const CONTENT_BOT = PH - FOOTER_H - 6;

    // Brand palette
    const C = {
      primary:   [79,  70,  229] as [number,number,number],  // indigo-600
      primaryDk: [55,  48,  163] as [number,number,number],  // indigo-800
      slate900:  [15,  23,  42]  as [number,number,number],
      slate700:  [51,  65,  85]  as [number,number,number],
      slate500:  [100, 116, 139] as [number,number,number],
      slate300:  [203, 213, 225] as [number,number,number],
      slate100:  [241, 245, 249] as [number,number,number],
      white:     [255, 255, 255] as [number,number,number],
      emerald:   [16,  185, 129] as [number,number,number],
      blue:      [59,  130, 246] as [number,number,number],
      amber:     [245, 158, 11]  as [number,number,number],
      red:       [220, 68,  68]  as [number,number,number],
      redLight:  [254, 226, 226] as [number,number,number],
      amberLight:[254, 243, 199] as [number,number,number],
      blueLight: [219, 234, 254] as [number,number,number],
      greenLight:[209, 250, 229] as [number,number,number],
    };

    let pageNum = 1;

    // ── Helpers ────────────────────────────────────────────────────────────────
    const _rgb = (c: [number,number,number]) => ({ r: c[0], g: c[1], b: c[2] });

    const setFill = (c: [number,number,number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setDraw = (c: [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const setTxt  = (c: [number,number,number]) => doc.setTextColor(c[0], c[1], c[2]);

    const scoreColor = (s: number): [number,number,number] =>
      s >= 80 ? C.emerald : s >= 60 ? C.blue : s >= 40 ? C.amber : C.red;
    const scoreLabel = (s: number) =>
      s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Critical';
    const priorityColor = (p: string): [number,number,number] =>
      p === 'critical' ? C.red : p === 'high' ? C.amber : p === 'medium' ? C.blue : C.emerald;
    const priorityBg = (p: string): [number,number,number] =>
      p === 'critical' ? C.redLight : p === 'high' ? C.amberLight : p === 'medium' ? C.blueLight : C.greenLight;

    const getCategoryScore = (catName: string) => {
      const cat = report.categories.find((c) => c.category === catName);
      return cat ? cat.score : 0;
    };

    // Logo dimensions: 600×178px → aspect ratio 3.37:1
    // In the 12mm header bar: logo height = 8mm → width = 8 * 3.37 = ~27mm
    const LOGO_H_HEADER = 8;
    const LOGO_W_HEADER = LOGO_H_HEADER * (600 / 178);

    // Draw page header (all pages except cover)
    const drawHeader = () => {
      setFill([0, 0, 0] as [number,number,number]);
      doc.rect(0, 0, PW, HEADER_H, 'F');
      // Logo left-aligned in header bar (black bg blends into indigo)
      doc.addImage(LEGACY_AI_LOGO_B64, 'JPEG', ML, (HEADER_H - LOGO_H_HEADER) / 2, LOGO_W_HEADER, LOGO_H_HEADER);
      // URL centered
      setTxt([160, 160, 160]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const urlTrunc = report.url.length > 55 ? report.url.substring(0, 52) + '...' : report.url;
      doc.text(urlTrunc, PW / 2, 7.5, { align: 'center' });
      // Page number right
      setTxt(C.white);
      doc.setFont('helvetica', 'bold');
      doc.text(`Page ${pageNum}`, PW - MR, 7.5, { align: 'right' });
    };

    // Draw page footer
    const drawFooter = () => {
      setFill([0, 0, 0] as [number,number,number]);
      doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, 'F');
      setDraw([40, 40, 40] as [number,number,number]);
      doc.setLineWidth(0.2);
      doc.line(0, PH - FOOTER_H, PW, PH - FOOTER_H);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      setTxt([160, 160, 160]);
      // Left side: brand name + clickable URLs
      doc.text("Legacy AI / Floyd's Labs  ·  ", ML, PH - 3.5);
      // Measure prefix width to position links correctly
      const prefixW = doc.getTextWidth("Legacy AI / Floyd's Labs  ·  ");
      setTxt([100, 160, 255]);
      doc.text('www.LegacyAI.space', ML + prefixW, PH - 3.5);
      const spaceW = doc.getTextWidth('www.LegacyAI.space');
      setTxt([160, 160, 160]);
      doc.text('  ·  ', ML + prefixW + spaceW, PH - 3.5);
      const dotW = doc.getTextWidth('  ·  ');
      setTxt([100, 160, 255]);
      doc.text('www.FloydsLabs.com', ML + prefixW + spaceW + dotW, PH - 3.5);
      const floydW = doc.getTextWidth('www.FloydsLabs.com');
      // Invisible clickable link rectangles (x, y, w, h) — y is top of click zone
      doc.link(ML + prefixW, PH - FOOTER_H, spaceW, FOOTER_H, { url: 'https://www.legacyai.space' });
      doc.link(ML + prefixW + spaceW + dotW, PH - FOOTER_H, floydW, FOOTER_H, { url: 'https://www.floydslabs.com' });
      // Right side: copyright
      setTxt([160, 160, 160]);
      doc.text(`© 2026 Legacy AI / Floyd's Labs. Confidential.`, PW - MR, PH - 3.5, { align: 'right' });
    };

    // Add a new page with header + footer
    const newPage = () => {
      doc.addPage();
      pageNum++;
      drawHeader();
      drawFooter();
    };

    // Section heading
    const sectionHeading = (title: string, y: number): number => {
      setFill(C.slate100);
      doc.rect(ML, y, CW, 7, 'F');
      setDraw(C.primary);
      doc.setLineWidth(0.5);
      doc.line(ML, y, ML, y + 7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setTxt(C.primaryDk);
      doc.text(title.toUpperCase(), ML + 4, y + 5);
      return y + 11;
    };

    // Score bar
    const scoreBar = (label: string, score: number, x: number, y: number, barW: number): number => {
      const col = scoreColor(score);
      const lbl = scoreLabel(score);
      // Label
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      setTxt(C.slate700);
      doc.text(label, x, y + 3.5);
      // Score number
      setTxt(col);
      doc.text(`${score}`, x + barW - 18, y + 3.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setTxt(C.slate500);
      doc.text(`/ 100  ${lbl}`, x + barW - 16, y + 3.5);
      // Track
      setFill(C.slate100);
      setDraw(C.slate300);
      doc.setLineWidth(0.1);
      doc.roundedRect(x, y + 5.5, barW, 3, 1, 1, 'FD');
      // Fill
      const fillW = Math.max(2, (score / 100) * barW);
      setFill(col);
      doc.roundedRect(x, y + 5.5, fillW, 3, 1, 1, 'F');
      return y + 12;
    };

    // Guard: ensure enough space, else new page
    const guard = (y: number, needed: number): number => {
      if (y + needed > CONTENT_BOT) { newPage(); return CONTENT_TOP; }
      return y;
    };

    // ── PAGE 1: COVER ──────────────────────────────────────────────────────────
    // Full-bleed indigo header band
    setFill([0, 0, 0] as [number,number,number]);
    doc.rect(0, 0, PW, 72, 'F');

    // Subtle diagonal accent
    setFill([0, 0, 0] as [number,number,number]);
    doc.triangle(PW - 60, 0, PW, 0, PW, 72, 'F');

    // Brand logo on cover — large version in the indigo band
    // Logo: 600×178px, aspect 3.37:1. Target height ~18mm on cover.
    const LOGO_H_COVER = 18;
    const LOGO_W_COVER = LOGO_H_COVER * (600 / 178);
    doc.addImage(LEGACY_AI_LOGO_B64, 'JPEG', ML, 8, LOGO_W_COVER, LOGO_H_COVER);

    // Report title
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    setTxt(C.white);
    doc.text('SEO & GEO', ML, 34);
    doc.text('Analysis Report', ML, 46);

    // Subtitle bar
    setFill([255, 255, 255, 0.15] as unknown as [number,number,number]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    setTxt([220, 220, 255]);
    doc.text('Enterprise Search & Generative Engine Optimization Audit', ML, 60);

    // Overall score badge (top-right of cover band)
    const badgeX = PW - MR - 32;
    const badgeY = 14;
    setFill(C.white);
    doc.roundedRect(badgeX, badgeY, 32, 40, 3, 3, 'F');
    const oc = scoreColor(report.overallScore);
    setTxt(oc);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(`${report.overallScore}`, badgeX + 16, badgeY + 20, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    setTxt(C.slate500);
    doc.text('OVERALL', badgeX + 16, badgeY + 27, { align: 'center' });
    setTxt(oc);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(scoreLabel(report.overallScore).toUpperCase(), badgeX + 16, badgeY + 34, { align: 'center' });

    // Meta block below cover band
    let cy = 82;
    setFill(C.slate100);
    doc.rect(ML, cy, CW, 22, 'F');
    setDraw(C.slate300);
    doc.setLineWidth(0.2);
    doc.rect(ML, cy, CW, 22, 'D');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setTxt(C.slate500);
    doc.text('ANALYZED URL', ML + 4, cy + 6);
    doc.setFont('helvetica', 'normal');
    setTxt(C.slate900);
    doc.setFontSize(9);
    const urlDisplay = report.url.length > 80 ? report.url.substring(0, 77) + '...' : report.url;
    doc.text(urlDisplay, ML + 4, cy + 13);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setTxt(C.slate500);
    doc.text('GENERATED', PW - MR - 50, cy + 6);
    doc.setFont('helvetica', 'normal');
    setTxt(C.slate900);
    doc.setFontSize(8.5);
    doc.text(new Date(report.timestamp).toLocaleString(), PW - MR - 50, cy + 13);

    cy += 30;

    // Executive summary — score grid (2 cols × 3 rows)
    cy = sectionHeading('Executive Summary', cy);

    const cats = [
      { label: 'On-Page SEO', score: getCategoryScore('onpage') },
      { label: 'GEO',         score: getCategoryScore('geo') },
      { label: 'CORE',        score: getCategoryScore('core') },
      { label: 'E-E-A-T',     score: getCategoryScore('eeat') },
      { label: 'Technical',   score: getCategoryScore('technical') },
    ];

    // 5 mini score tiles in a row
    const tileW = CW / 5 - 2;
    cats.forEach((cat, i) => {
      const tx = ML + i * (tileW + 2.5);
      const col = scoreColor(cat.score);
      setFill(C.white);
      setDraw(C.slate300);
      doc.setLineWidth(0.2);
      doc.roundedRect(tx, cy, tileW, 22, 2, 2, 'FD');
      // Color top strip
      setFill(col);
      doc.roundedRect(tx, cy, tileW, 4, 2, 2, 'F');
      doc.rect(tx, cy + 2, tileW, 2, 'F'); // square bottom of strip
      // Score
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      setTxt(col);
      doc.text(`${cat.score}`, tx + tileW / 2, cy + 14, { align: 'center' });
      // Label
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      setTxt(C.slate500);
      doc.text(cat.label, tx + tileW / 2, cy + 20, { align: 'center' });
    });
    cy += 28;

    // Action item summary counts
    const critCount = report.actionItems.filter(i => i.priority === 'critical').length;
    const highCount = report.actionItems.filter(i => i.priority === 'high').length;
    const medCount  = report.actionItems.filter(i => i.priority === 'medium').length;
    const lowCount  = report.actionItems.filter(i => i.priority === 'low').length;

    const summaryItems = [
      { label: 'Critical', count: critCount, col: C.red,    bg: C.redLight },
      { label: 'High',     count: highCount, col: C.amber,  bg: C.amberLight },
      { label: 'Medium',   count: medCount,  col: C.blue,   bg: C.blueLight },
      { label: 'Low',      count: lowCount,  col: C.emerald,bg: C.greenLight },
    ];

    const sumW = CW / 4 - 2;
    summaryItems.forEach((s, i) => {
      const sx = ML + i * (sumW + 2.7);
      setFill(s.bg);
      setDraw(s.col);
      doc.setLineWidth(0.3);
      doc.roundedRect(sx, cy, sumW, 14, 2, 2, 'FD');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      setTxt(s.col);
      doc.text(`${s.count}`, sx + sumW / 2, cy + 9, { align: 'center' });
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      setTxt(s.col);
      doc.text(s.label.toUpperCase(), sx + sumW / 2, cy + 13, { align: 'center' });
    });
    cy += 20;

    // ── Cover: "What This Report Contains" section ─────────────────────────
    cy += 4;
    cy = sectionHeading('What This Report Contains', cy);

    const reportSections = [
      { num: '01', title: 'Score Breakdown',          desc: 'Overall score, per-category scores with visual progress bars, and scoring weight methodology.' },
      { num: '02', title: 'Prioritized Action Items', desc: `${report.actionItems.length} specific, ranked recommendations sorted by impact — Critical, High, Medium, and Low priority.` },
      { num: '03', title: 'Copy-Ready LLM Prompt',    desc: 'A structured prompt you can paste directly into ChatGPT or Claude to implement all recommended fixes.' },
    ];

    const secW = (CW - 6) / 3;
    reportSections.forEach((sec, i) => {
      const sx = ML + i * (secW + 3);
      setFill(C.white);
      setDraw(C.slate300);
      doc.setLineWidth(0.2);
      doc.roundedRect(sx, cy, secW, 32, 2, 2, 'FD');
      // Number badge
      setFill(C.primary);
      doc.roundedRect(sx + 4, cy + 4, 10, 8, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      setTxt(C.white);
      doc.text(sec.num, sx + 9, cy + 9.5, { align: 'center' });
      // Title
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setTxt(C.slate900);
      doc.text(sec.title, sx + 4, cy + 18);
      // Desc
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      setTxt(C.slate500);
      const dLines = doc.splitTextToSize(sec.desc, secW - 8) as string[];
      doc.text(dLines.slice(0, 3), sx + 4, cy + 23);
    });
    cy += 38;

    // ── Cover: Key Findings strip ──────────────────────────────────────────
    setFill(C.primaryDk);
    doc.roundedRect(ML, cy, CW, 14, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setTxt(C.white);
    doc.text('KEY FINDINGS', ML + 4, cy + 5.5);
    doc.setFont('helvetica', 'normal');
    setTxt([200, 200, 255]);
    doc.setFontSize(7);
    const topIssue = report.actionItems[0];
    const finding = topIssue
      ? `Top priority: ${topIssue.title.replace(/\.\.\.$/, '')}  ·  ${critCount} critical issues require immediate attention`
      : `${report.actionItems.length} action items identified across ${report.categories.length} analysis dimensions`;
    const findingLines = doc.splitTextToSize(finding, CW - 8) as string[];
    doc.text(findingLines[0] ?? '', ML + 4, cy + 11);

    // Cover page footer
    drawFooter();

    // ── PAGE 2: SCORE BREAKDOWN ────────────────────────────────────────────────
    newPage();
    let y = CONTENT_TOP;

    y = sectionHeading('Score Breakdown', y);

    // Overall score large display
    setFill(C.slate100);
    doc.roundedRect(ML, y, CW, 18, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setTxt(C.slate700);
    doc.text('OVERALL SCORE', ML + 6, y + 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setTxt(C.slate500);
    doc.text('Weighted composite across all five analysis dimensions', ML + 6, y + 13);
    // Big score
    const oc2 = scoreColor(report.overallScore);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    setTxt(oc2);
    doc.text(`${report.overallScore}`, PW - MR - 28, y + 10, { align: 'right' });
    doc.setFontSize(9);
    setTxt(C.slate500);
    doc.text('/ 100', PW - MR - 26, y + 10);
    setTxt(oc2);
    doc.setFontSize(8);
    doc.text(scoreLabel(report.overallScore), PW - MR - 26, y + 15);
    y += 22;

    // Category score bars
    cats.forEach(cat => {
      y = guard(y, 14);
      y = scoreBar(cat.label, cat.score, ML, y, CW);
    });

    y += 6;
    y = sectionHeading('Category Weights', y);

    // Weights table
    const weightData = [
      ['On-Page SEO', '25%', 'Title, meta, headings, images, links, Open Graph, Twitter Card, canonical'],
      ['GEO',         '25%', 'Citation readiness, FAQ schema, Schema.org, quotability, statistics, definitions'],
      ['CORE',        '20%', 'Contextual clarity, organization, referenceability, exclusivity'],
      ['E-E-A-T',     '15%', 'Experience, expertise, authoritativeness, trust signals'],
      ['Technical',   '15%', 'Robots, viewport, charset, performance, mobile, HTTPS, hreflang'],
    ];

    const colW = [38, 16, CW - 54];
    const rowH = 11; // increased from 9 for better readability

    // Table header
    setFill(C.primaryDk);
    doc.rect(ML, y, CW, rowH, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setTxt(C.white);
    doc.text('Category', ML + 2, y + 7.5);
    doc.text('Weight', ML + colW[0] + 2, y + 7.5);
    doc.text('Checks Included', ML + colW[0] + colW[1] + 2, y + 7.5);
    y += rowH;

    weightData.forEach((row, i) => {
      setFill(i % 2 === 0 ? C.white : C.slate100);
      doc.rect(ML, y, CW, rowH, 'F');
      setDraw(C.slate300);
      doc.setLineWidth(0.1);
      doc.rect(ML, y, CW, rowH, 'D');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setTxt(C.slate900);
      doc.text(row[0], ML + 2, y + 7.5);
      doc.setFont('helvetica', 'normal');
      setTxt(C.primary);
      doc.setFontSize(8);
      doc.text(row[1], ML + colW[0] + 2, y + 7.5);
      setTxt(C.slate700);
      doc.setFontSize(7.5);
      const descLines = doc.splitTextToSize(row[2], colW[2] - 4) as string[];
      doc.text(descLines[0] ?? '', ML + colW[0] + colW[1] + 2, y + 7.5);
      y += rowH;
    });

    // ── Score Interpretation Guide (fills page 2 gap) ──────────────────────
    y += 8;
    y = sectionHeading('Score Interpretation Guide', y);

    const scoreRanges = [
      { range: '80 – 100', label: 'Excellent', col: C.emerald, bg: C.greenLight, desc: 'Best-in-class. Maintain and monitor for regressions.' },
      { range: '60 – 79',  label: 'Good',      col: C.blue,   bg: C.blueLight,  desc: 'Solid foundation. Address remaining gaps for competitive edge.' },
      { range: '40 – 59',  label: 'Fair',       col: C.amber,  bg: C.amberLight, desc: 'Significant improvement needed. Prioritize high-impact fixes.' },
      { range: '0 – 39',   label: 'Critical',   col: C.red,    bg: C.redLight,   desc: 'Urgent attention required. These issues directly harm visibility.' },
    ];

    const interpW = (CW - 9) / 4;
    scoreRanges.forEach((sr, i) => {
      const ix = ML + i * (interpW + 3);
      setFill(sr.bg);
      setDraw(sr.col);
      doc.setLineWidth(0.3);
      doc.roundedRect(ix, y, interpW, 28, 2, 2, 'FD');
      // Color band top
      setFill(sr.col);
      doc.roundedRect(ix, y, interpW, 5, 2, 2, 'F');
      doc.rect(ix, y + 3, interpW, 2, 'F');
      // Range
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setTxt(sr.col);
      doc.text(sr.range, ix + interpW / 2, y + 13, { align: 'center' });
      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      setTxt(sr.col);
      doc.text(sr.label.toUpperCase(), ix + interpW / 2, y + 19, { align: 'center' });
      // Desc
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      setTxt(C.slate700);
      const dLines = doc.splitTextToSize(sr.desc, interpW - 4) as string[];
      doc.text(dLines.slice(0, 2), ix + 2, y + 24);
    });
    y += 34;

    // ── PAGE 3+: ACTION ITEMS ──────────────────────────────────────────────────
    newPage();
    y = CONTENT_TOP;
    y = sectionHeading('Prioritized Action Items', y);

    // Summary strip
    setFill(C.slate100);
    doc.rect(ML, y, CW, 10, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    setTxt(C.slate700);
    doc.text(
      `${report.actionItems.length} total items  ·  ${critCount} Critical  ·  ${highCount} High  ·  ${medCount} Medium  ·  ${lowCount} Low`,
      ML + 4, y + 6.5
    );
    y += 14;

    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedItems = [...report.actionItems].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    sortedItems.forEach((item) => {
      const col = priorityColor(item.priority);
      const bg  = priorityBg(item.priority);

      // Clean title: strip trailing '...' added by ActionItemGenerator, use full description as body
      const cleanTitle = item.title.replace(/\.\.\.$/, '').trim();
      const titleLines = doc.splitTextToSize(cleanTitle, CW - 36) as string[];
      const descLines  = doc.splitTextToSize(item.description, CW - 36) as string[];

      // Effort + impact row
      const effortLabel = item.effort ? `Effort: ${item.effort.charAt(0).toUpperCase() + item.effort.slice(1)}` : '';
      const impactShort = item.impact ? item.impact.substring(0, 60) + (item.impact.length > 60 ? '…' : '') : '';

      const metaRowH = (effortLabel || impactShort) ? 5 : 0;
      const cardH = 6 + titleLines.length * 4.5 + descLines.length * 3.8 + metaRowH + 5;

      y = guard(y, cardH + 3);

      // Card background
      setFill(bg);
      setDraw(col);
      doc.setLineWidth(0.3);
      doc.roundedRect(ML, y, CW, cardH, 1.5, 1.5, 'FD');

      // Priority stripe (left edge)
      setFill(col);
      doc.roundedRect(ML, y, 3.5, cardH, 1.5, 1.5, 'F');
      doc.rect(ML + 1.5, y, 2, cardH, 'F');

      // Priority badge
      setFill(col);
      doc.roundedRect(ML + 6, y + 3, 18, 5, 1, 1, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      setTxt(C.white);
      doc.text(item.priority.toUpperCase(), ML + 15, y + 6.8, { align: 'center' });

      // Category label
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      setTxt(C.slate500);
      doc.text(item.category.toUpperCase(), ML + 27, y + 6.8);

      // Effort pill (right side of header row)
      if (effortLabel) {
        const effortCol: [number,number,number] =
          item.effort === 'low' ? C.emerald : item.effort === 'medium' ? C.amber : C.red;
        setFill(effortCol);
        doc.roundedRect(ML + CW - 22, y + 3, 18, 5, 1, 1, 'F');
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        setTxt(C.white);
        doc.text(effortLabel.toUpperCase(), ML + CW - 13, y + 6.8, { align: 'center' });
      }

      // Title
      let iy = y + 12;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      setTxt(C.slate900);
      doc.text(titleLines, ML + 6, iy);
      iy += titleLines.length * 4.5;

      // Description
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      setTxt(C.slate700);
      doc.text(descLines, ML + 6, iy);
      iy += descLines.length * 3.8;

      // Impact line
      if (impactShort) {
        iy += 1.5;
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'italic');
        setTxt(C.slate500);
        doc.text(`Impact: ${impactShort}`, ML + 6, iy);
      }

      y += cardH + 3;
    });

    // ── Next Steps section (fills trailing gap on last action items page) ──
    y = guard(y, 30);
    if (y < CONTENT_BOT - 30) {
      y += 4;
      y = sectionHeading('Next Steps', y);
      const steps = [
        '1. Address all Critical items immediately — these directly harm search and AI visibility.',
        '2. Use the LLM Prompt on the final page to generate implementation code with ChatGPT or Claude.',
        '3. Re-run this analysis after implementing fixes to track score improvements.',
        '4. Focus on GEO and E-E-A-T categories for AI engine citation gains.',
      ];
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      setTxt(C.slate700);
      steps.forEach((step) => {
        y = guard(y, 6);
        doc.text(step, ML + 2, y);
        y += 6;
      });
    }

    // ── SAVE ──────────────────────────────────────────────────────────────────
    doc.save(`seo-analysis-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* ── Hero Input Panel ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Input Card — spans 2 cols */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Website Analysis</CardTitle>
            </div>
            <CardDescription>
              Enter any URL to run a comprehensive SEO &amp; GEO audit across 80+ data points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL Input Row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAnalyze(); }}
                  placeholder="https://example.com"
                  className="pl-9 h-10 text-sm"
                  disabled={isAnalyzing}
                />
              </div>
              <Button
                onClick={() => void handleAnalyze()}
                disabled={isAnalyzing || !url.trim()}
                className="h-10 px-5 shrink-0"
              >
                {isAnalyzing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing</>
                ) : (
                  <><span>Analyze</span><ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>

            {/* Quick URLs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Quick test:</span>
              {QUICK_URLS.map((testUrl) => (
                <button
                  key={testUrl}
                  onClick={() => setUrl(testUrl)}
                  disabled={isAnalyzing}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                >
                  {new URL(testUrl).hostname.replace('www.', '')}
                </button>
              ))}
            </div>

            {/* Loading Status */}
            {isAnalyzing && (
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>{loadingStatus}</span>
                </div>
                <Progress value={loadingStatus.includes('Analyzing') ? 75 : 35} className="h-1.5" />
              </div>
            )}

            {/* Error */}
            {error && !isAnalyzing && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">Analysis Failed</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void handleAnalyze()} className="shrink-0 h-7 text-xs">
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Stats Card */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Platform Coverage</CardTitle>
            </div>
            <CardDescription>What this audit checks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'On-Page SEO', icon: Target, points: '24 checks' },
                { label: 'GEO Signals', icon: Bot, points: '18 checks' },
                { label: 'Core Web Vitals', icon: Zap, points: '12 checks' },
                { label: 'E-E-A-T Signals', icon: ShieldCheck, points: '16 checks' },
                { label: 'Technical SEO', icon: Activity, points: '14 checks' },
              ].map(({ label, icon: Icon, points }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-normal">{points}</Badge>
                </div>
              ))}
              <Separator className="my-1" />
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold">Total Coverage</span>
                <Badge variant="default" className="text-xs">84+ checks</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {report && !isAnalyzing && (
        <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Results Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium truncate">Analyzed:</span>
              <a
                href={report.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 truncate max-w-xs sm:max-w-md"
              >
                {report.url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleReset} className="h-8 text-xs gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> New Scan
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="h-8 text-xs gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> Export PDF
              </Button>
            </div>
          </div>

          {/* ── Score Dashboard ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Overall Score */}
            <Card className="border-border/60 lg:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Overall Score</CardTitle>
                </div>
                <CardDescription>Composite across all categories</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pt-2">
                <ScoreRing score={report.overallScore} size={140} />
                <div className="text-center">
                  <Badge variant={getScoreVariant(report.overallScore)} className="text-xs px-3 py-1">
                    {getScoreLabel(report.overallScore)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on 84+ data points
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Category Scores */}
            <Card className="border-border/60 lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Category Breakdown</CardTitle>
                </div>
                <CardDescription>Score by analysis dimension</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {report.categories.map((cat) => {
                  const meta = CATEGORY_META[cat.category];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{meta.label}</span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">{meta.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-bold tabular-nums', getScoreColor(cat.score))}>
                            {cat.score}
                          </span>
                          <Badge variant={getScoreVariant(cat.score)} className="text-xs w-16 justify-center">
                            {getScoreLabel(cat.score)}
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={cat.score}
                        className={cn(
                          'h-1.5',
                          cat.score >= 80 ? '[&>div]:bg-emerald-500' :
                          cat.score >= 60 ? '[&>div]:bg-blue-500' :
                          cat.score >= 40 ? '[&>div]:bg-amber-500' :
                          '[&>div]:bg-red-500'
                        )}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* ── Action Items + LLM Prompt ───────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Action Items — 2 cols */}
            <Card className="border-border/60 xl:col-span-2">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Prioritized Action Items</CardTitle>
                  </div>
                  <div className="flex gap-1.5">
                    {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
                      const count = report.actionItems.filter((i) => i.priority === p).length;
                      if (count === 0) return null;
                      return (
                        <Badge key={p} variant={PRIORITY_CONFIG[p].variant} className="text-xs">
                          {count} {p}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <CardDescription>Fix these issues to improve your scores</CardDescription>
              </CardHeader>
              <CardContent>
                {report.actionItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                    <p className="font-semibold text-sm">No action items found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your page is exceptionally well optimized.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {[...report.actionItems]
                      .sort((a, b) => {
                        const p: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                        return p[a.priority] - p[b.priority];
                      })
                      .map((item, i) => {
                        const cfg = PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG];
                        const PriorityIcon = cfg.icon;
                        return (
                          <div
                            key={i}
                            className={cn(
                              'rounded-lg border-l-4 p-4 space-y-1.5',
                              cfg.border,
                              cfg.bg
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <PriorityIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge variant={cfg.variant} className="text-xs uppercase tracking-wide">
                                    {item.priority}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{item.category}</span>
                                </div>
                                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LLM Prompt — 1 col */}
            <Card className="border-border/60 xl:col-span-1 flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">LLM Prompt</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyLLMPrompt()}
                    className="h-7 text-xs gap-1.5"
                  >
                    {copied ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Paste into ChatGPT or Claude to implement fixes
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 rounded-lg bg-muted/60 border border-border/60 p-4 overflow-auto max-h-[480px]">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed break-words">
                    {report.llmPrompts.join('\n\n')}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* ── Empty State (no report, no error, not loading) ────────────── */}
      {!report && !isAnalyzing && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Search,
              title: 'Comprehensive Audit',
              desc: 'Analyze title tags, meta descriptions, heading structure, content quality, and 20+ on-page factors.',
            },
            {
              icon: Bot,
              title: 'GEO Optimization',
              desc: 'Evaluate AI engine readiness — structured data, entity clarity, and generative search signals.',
            },
            {
              icon: ShieldCheck,
              title: 'E-E-A-T Analysis',
              desc: 'Assess expertise, experience, authoritativeness, and trustworthiness signals across your content.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border/60 bg-muted/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
