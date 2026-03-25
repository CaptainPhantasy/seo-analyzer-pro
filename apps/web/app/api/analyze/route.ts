import { NextResponse } from 'next/server';

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
    // We use a custom User-Agent to avoid being blocked by some basic bot protections
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SEOAnalyzerPro/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // Set a reasonable timeout
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch website: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    return NextResponse.json({ html, url: targetUrl });
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred while fetching the website' },
      { status: 500 }
    );
  }
}
