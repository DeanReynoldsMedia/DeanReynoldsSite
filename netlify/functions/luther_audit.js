// netlify/functions/luther_audit.js
// Fetches and audits pages on approved domains for the Luther AI assistant.
//
// Environment variable:
//   ALLOWED_AUDIT_DOMAINS = comma-separated list
//   Example: "deanreynolds.com,immigrationforbusiness.com"

const DEFAULT_DOMAINS = ['deanreynolds.com'];

const ALLOWED_ORIGINS = [
  'https://deanreynolds.com',
  'https://www.deanreynolds.com',
  'https://luther-publishing-guide.lovable.app',
  'https://lovable.app',
  'https://www.lovable.app'
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    var url = new URL(origin);
    return url.hostname === 'lovable.app' || url.hostname.endsWith('.lovable.app');
  } catch (e) {
    return false;
  }
}

function corsHeaders(origin) {
  var reflected = isOriginAllowed(origin) ? origin : 'https://deanreynolds.com';
  return {
    'Access-Control-Allow-Origin': reflected,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; LutherAuditBot/1.0; +https://deanreynolds.com)';

const FETCH_TIMEOUT_MS = 10000;

function getAllowedDomains() {
  var env = (process.env.ALLOWED_AUDIT_DOMAINS || '').trim();
  if (!env) return DEFAULT_DOMAINS;
  return env
    .split(',')
    .map(function (d) { return d.trim().toLowerCase(); })
    .filter(Boolean);
}

function isDomainAllowed(hostname) {
  var domains = getAllowedDomains();
  var h = hostname.toLowerCase();
  return domains.some(function (d) {
    return h === d || h.endsWith('.' + d);
  });
}

function extract(html, regex, group) {
  if (typeof group === 'undefined') group = 1;
  var m = html.match(regex);
  return m ? m[group].trim() : null;
}

function auditPage(html, url) {
  var title = extract(html, /<title[^>]*>([^<]*)<\/title>/i);

  var metaDescription =
    extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);

  var h1Raw = extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  var h1 = h1Raw ? h1Raw.replace(/<[^>]+>/g, '').trim() : null;

  var canonical =
    extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ||
    extract(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);

  var textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  var wordCount = textOnly.split(/\s+/).filter(Boolean).length;

  var linkMatches = html.match(/<a[^>]+href=["'][^"']*["']/gi) || [];
  var internalLinksCount = 0;
  var parsed;
  try { parsed = new URL(url); } catch (e) { parsed = null; }
  var host = parsed ? parsed.hostname : '';

  for (var i = 0; i < linkMatches.length; i++) {
    var href = (linkMatches[i].match(/href=["']([^"']*)["']/i) || [])[1] || '';
    if (href.startsWith('/') || href.includes(host)) internalLinksCount++;
  }

  var issues = [];
  if (!title) issues.push('Missing title tag');
  else if (title.length > 60) issues.push('Title too long (' + title.length + ' chars, aim for 60 or less)');
  if (!metaDescription) issues.push('Missing meta description');
  else if (metaDescription.length > 160) issues.push('Meta description too long (' + metaDescription.length + ' chars)');
  if (!h1) issues.push('Missing H1 tag');
  if (!canonical) issues.push('Missing canonical link');
  if (wordCount < 300) issues.push('Low word count (' + wordCount + ', aim for 300+)');
  if (internalLinksCount < 2) issues.push('Very few internal links (' + internalLinksCount + ')');

  return { url: url, title: title, metaDescription: metaDescription, h1: h1, canonical: canonical, wordCount: wordCount, internalLinksCount: internalLinksCount, issues: issues };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

exports.handler = async function (event) {
  var origin = event.headers.origin || event.headers.Origin || '';
  var headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  var body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  var url = body && body.url;
  if (!url || typeof url !== 'string') {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Missing or invalid "url" field' }) };
  }

  var parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid URL format' }) };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Only http/https URLs allowed' }) };
  }

  if (!parsed.hostname) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'URL has no hostname' }) };
  }

  if (!isDomainAllowed(parsed.hostname)) {
    return {
      statusCode: 403,
      headers: headers,
      body: JSON.stringify({ error: 'Domain not allowed', hostname: parsed.hostname })
    };
  }

  var html;
  try {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);

    var res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: headers,
        body: JSON.stringify({ error: 'Upstream returned ' + res.status + ' for ' + url })
      };
    }
    html = await res.text();
  } catch (err) {
    var msg = err.name === 'AbortError'
      ? 'Request timed out after ' + (FETCH_TIMEOUT_MS / 1000) + 's'
      : 'Failed to fetch page: ' + (err.message || String(err));
    return { statusCode: 502, headers: headers, body: JSON.stringify({ error: msg }) };
  }

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(auditPage(html, url))
  };
};
