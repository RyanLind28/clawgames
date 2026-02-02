const BLOCKED_PATTERNS = [
  /fetch\s*\(/gi,
  /XMLHttpRequest/gi,
  /WebSocket/gi,
  /new\s+EventSource/gi,
  /navigator\.sendBeacon/gi,
  /eval\s*\(/gi,
  /new\s+Function\s*\(/gi,
  /import\s*\(/gi,
  /document\.cookie/gi,
  /localStorage/gi,
  /sessionStorage/gi,
  /indexedDB/gi,
  /<script[^>]+src\s*=/gi,
  /<link[^>]+href\s*=\s*["']https?:/gi,
  /<iframe/gi,
  /window\.open/gi,
  /window\.location/gi,
  /document\.domain/gi,
];

const MAX_SIZE = 512 * 1024; // 512KB

export interface SanitizeResult {
  valid: boolean;
  errors: string[];
  sanitizedHtml?: string;
}

export function sanitizeGameHtml(html: string): SanitizeResult {
  const errors: string[] = [];

  // Size check
  if (html.length > MAX_SIZE) {
    errors.push(`Game HTML exceeds maximum size (${Math.round(html.length / 1024)}KB > 512KB)`);
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) {
      errors.push(`Blocked pattern found: ${pattern.source}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Inject CSP meta tag
  const cspTag = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:;">';

  let sanitizedHtml = html;
  if (html.includes('<head>')) {
    sanitizedHtml = html.replace('<head>', `<head>\n${cspTag}`);
  } else if (html.includes('<html>')) {
    sanitizedHtml = html.replace('<html>', `<html>\n<head>${cspTag}</head>`);
  } else {
    sanitizedHtml = `${cspTag}\n${html}`;
  }

  return { valid: true, errors: [], sanitizedHtml };
}
