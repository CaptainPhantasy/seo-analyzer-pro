import { NextResponse } from 'next/server';
import { SEOAnalyzer } from '@seo-analyzer-pro/analyzer-core';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    const url = body.url;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Ensure URL has protocol
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    // Fetch the website content
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SEOAnalyzerPro/1.0 (LLM API)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch website: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Initialize the analyzer
    const analyzer = new SEOAnalyzer();
    
    // Run the analysis
    const analysisReport = await analyzer.analyze({ html, url: targetUrl });

    // Return the full machine-readable report
    return NextResponse.json(analysisReport);
  } catch (error) {
    console.error('API v1 Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred during analysis' },
      { status: 500 }
    );
  }
}
