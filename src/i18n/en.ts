const en: Record<string, string> = {
  // ------------------------------------------------------------------ app --
  'app.name': 'MetaLens',
  'app.tagline': 'See how your links look before you share.',
  'app.taglineZh': '分享之前，先看看链接呈现的样子。',
  'app.description':
    'Inspect title, description, Open Graph and X Card tags, then preview the share card for X, Facebook, LinkedIn and WeChat.',
  'app.privacy': 'Everything is parsed locally in your browser. Nothing is uploaded.',
  'app.disclaimer':
    'Simulated preview built from meta tags. It does not reproduce a platform’s internal ranking, caching or truncation rules.',

  // --------------------------------------------------------------- header --
  'header.author': 'Author on X',
  'header.github': 'Source code on GitHub',
  'header.theme': 'Toggle theme',
  'header.language': 'Switch language',
  'header.help': 'How scoring works',

  // ---------------------------------------------------------------- input --
  'input.urlLabel': 'Page URL',
  'input.urlPlaceholder': 'https://example.com/article',
  'input.check': 'Inspect',
  'input.checking': 'Inspecting…',
  'input.tab.url': 'From URL',
  'input.tab.html': 'Paste HTML',
  'input.tab.manual': 'Manual',
  'input.tab.sample': 'Samples',
  'input.htmlLabel': 'Paste the page’s HTML source',
  'input.htmlPlaceholder':
    '<!doctype html>\n<html lang="en">\n  <head>\n    <title>Your page title</title>\n    <meta property="og:title" content="…" />\n  </head>\n</html>',
  'input.htmlAnalyze': 'Analyze HTML',
  'input.manualHelp':
    'Fill in the fields you care about. Previews and the health report update as you type.',
  'input.sampleHelp': 'Built-in demo data — no URL or network access required.',
  'input.sampleLoad': 'Load sample',
  'input.manualStart': 'Start from a blank document',
  'input.clear': 'Clear',
  'input.charCount': '{n} characters',
  'input.hint': 'Press ⌘/Ctrl + Enter to inspect',
  'input.demoBadge': 'Demo data',

  // --------------------------------------------------------------- errors --
  'error.invalidUrl': 'That is not a valid http(s) URL.',
  'error.cors':
    'The browser blocked the request (almost always CORS — the target site does not allow other origins to read its HTML).',
  'error.blocked': 'The fetch service refused this target (local, private or reserved address).',
  'error.httpError': 'The server answered with an error status: {detail}.',
  'error.notHtml': 'That URL did not return an HTML document ({detail}).',
  'error.timeout': 'The request took too long and was cancelled.',
  'error.network': 'Network error while loading the page.',
  'error.tooLarge': 'The page is larger than the size limit and was cut short.',
  'error.endpointInvalid': 'The configured fetch endpoint is not a valid http(s) URL.',
  'error.endpointError': 'The fetch endpoint did not return a usable result.',
  'error.title': 'Could not fetch this URL',
  'error.whatNow': 'What you can do instead',
  'error.action.paste': 'Paste the HTML source',
  'error.action.pasteHelp':
    'Open the page, press Ctrl/Cmd + U to view source, copy everything and paste it in the “Paste HTML” tab. The analysis is identical.',
  'error.action.manual': 'Fill in the meta tags manually',
  'error.action.manualHelp': 'Use the “Manual” tab to type the values and still get live previews.',
  'error.action.endpoint': 'Run your own fetch endpoint',
  'error.action.endpointHelp':
    'This repository ships a hardened Cloudflare Worker in worker/. Deploy it and paste its URL in Settings → Fetch endpoint. It refuses private networks, re-validates every redirect, caps size and time.',
  'error.openSettings': 'Open settings',

  // --------------------------------------------------------------- status --
  'status.ok': 'OK',
  'status.missing': 'Missing',
  'status.warning': 'Warning',
  'status.unverified': 'Unverified',
  'status.all': 'All',

  // --------------------------------------------------------------- groups --
  'group.basic': 'Basics',
  'group.og': 'Open Graph',
  'group.twitter': 'X Cards',
  'group.image': 'Images',

  // ------------------------------------------------------------------ nav --
  'nav.overview': 'Overview',
  'nav.results': 'Checks',
  'nav.preview': 'Previews',
  'nav.editor': 'Editor',
  'nav.code': 'Meta code',
  'nav.history': 'History',
  'nav.settings': 'Settings',
  'nav.jump': 'Jump to',

  // --------------------------------------------------------------- health --
  'health.title': 'Health',
  'health.score': 'Health score',
  'health.of': 'of 100',
  'health.grade.excellent': 'Excellent',
  'health.grade.good': 'Good',
  'health.grade.fair': 'Needs work',
  'health.grade.poor': 'Poor',
  'health.summary': '{ok} ok · {warning} warnings · {missing} missing · {unverified} unverified',
  'health.rules.title': 'How the score is calculated',
  'health.rules.formula':
    'score = round(100 × Σ(weight × status credit) / Σ(weight)). Only weights above zero are counted.',
  'health.rules.credit':
    'Status credit: OK = 1.0, Unverified = 0.75, Warning = 0.55, Missing = 0.',
  'health.rules.weights':
    'Field weights: title, description, og:title, og:description, og:image, twitter:card, twitter:image = 3; canonical, viewport, favicon, og:url, og:type, twitter:title, twitter:description = 2; lang, robots, og:site_name, og:locale, og:image:alt, twitter:site, twitter:creator = 1.',
  'health.rules.caveat':
    'The score is a convenience summary, not a platform verdict. The findings list below is the authoritative output.',
  'health.checks': '{n} checks',
  'health.problems': '{n} issues',
  'health.noProblems': 'No issues found in the checks that could run.',

  // ---------------------------------------------------------------- issue --
  'issue.title.missing': 'No <title> element.',
  'issue.title.empty': 'The <title> element is empty.',
  'issue.title.short': '<title> is only {len} characters (advisory minimum {min}).',
  'issue.title.long':
    '<title> is {len} characters; many surfaces cut around {max}–{hardMax}. Advisory only.',
  'issue.title.ok': '<title> is a usable {len} characters.',
  'issue.title.duplicate': 'Found {count} <title> elements; scrapers may pick the wrong one.',
  'issue.description.missing': 'No meta description.',
  'issue.description.empty': 'The meta description is present but empty.',
  'issue.description.short': 'The description is only {len} characters (advisory minimum {min}).',
  'issue.description.long':
    'The description is {len} characters; feeds usually truncate around {max}. Advisory only.',
  'issue.description.ok': 'The description is {len} characters — a comfortable length.',
  'issue.description.duplicate': '{count} description tags found. Only one should exist.',
  'issue.canonical.missing': 'No <link rel="canonical">.',
  'issue.canonical.relative':
    'The canonical URL is relative ({resolved}). Sharing tools expect an absolute URL.',
  'issue.canonical.invalid': 'The canonical URL is not a resolvable http(s) URL.',
  'issue.canonical.mismatch': 'Canonical ({canonical}) differs from the inspected page ({current}).',
  'issue.canonical.ok': 'The canonical URL is absolute and matches the page.',
  'issue.canonical.duplicate': '{count} canonical links found; only the first is used.',
  'issue.lang.missing': 'The <html> element has no lang attribute.',
  'issue.lang.ok': 'Page language is declared as “{value}”.',
  'issue.robots.noindex':
    'This page asks crawlers not to index it (robots = “{value}”). Link previews may still work, but the page will not be searchable.',
  'issue.robots.ok': 'No noindex directive.',
  'issue.viewport.missing': 'No viewport meta tag — the page will render zoomed out on phones.',
  'issue.viewport.invalid': 'The viewport tag does not set width=device-width.',
  'issue.viewport.ok': 'Mobile viewport is configured.',
  'issue.favicon.missing': 'No favicon link.',
  'issue.favicon.relative': 'The favicon path is relative ({resolved}); some platforms cannot resolve it.',
  'issue.favicon.invalid': 'The favicon URL cannot be resolved.',
  'issue.favicon.ok': 'Favicon found.',
  'issue.og.missing': '{field} is missing.',
  'issue.og.empty': '{field} is present but empty.',
  'issue.og.ok': '{field} is set.',
  'issue.og.fallback': '{field} is missing, but {fallback} will be used as a fallback.',
  'issue.og.duplicate': '{field} appears {count} times: {values}',
  'issue.og.image.relative': '{field} is a relative path and was resolved to {resolved}.',
  'issue.og.url.mismatch': 'og:url ({ogUrl}) differs from the canonical URL ({canonical}).',
  'issue.twitter.card.invalid':
    'twitter:card value “{value}” is not one of: {allowed}.',
  'issue.twitter.card.noImage': 'Card type is summary_large_image but no image is available.',
  'issue.twitter.image.relative': '{field} is a relative path and was resolved to {resolved}.',
  'issue.twitter.missing': '{field} is missing.',
  'issue.twitter.empty': '{field} is present but empty.',
  'issue.twitter.fallback': '{field} is not set; {fallback} will be used instead.',
  'issue.twitter.ok': '{field} is set.',
  'issue.twitter.duplicate': '{field} appears {count} times: {values}',
  'issue.image.ok': '{field} loads ({w}×{h}).',
  'issue.image.invalid': '{field} is not a resolvable http(s) URL.',
  'issue.image.notChecked': '{field} was not loaded yet.',
  'issue.image.timeout': '{field} timed out while loading.',
  'issue.image.unreachable':
    '{field} could not be loaded ({reason}). This can be a missing file, hotlink protection or a CORS restriction — the size is unknown.',
  'issue.image.tooSmall': '{field} is only {w}×{h}; small images look blurry in large cards.',
  'issue.image.aspect':
    '{field} has an aspect ratio of {ratio}:1; ~1.91:1 fills large cards without cropping.',

  // ------------------------------------------------------------------ fix --
  'fix.field.title': 'Add a unique, descriptive title; put the most specific words first.',
  'fix.field.description':
    'Write 50–160 characters that explain what the reader gets. Use it as ad copy, not as a keyword list.',
  'fix.field.canonical':
    'Point the canonical link at the one URL you want share cards and search results to use.',
  'fix.field.lang': 'Set the language on the <html> element, e.g. lang="en" or lang="zh-CN".',
  'fix.field.robots': 'Only use noindex when the page really should stay out of search results.',
  'fix.field.viewport':
    'Add <meta name="viewport" content="width=device-width, initial-scale=1" />.',
  'fix.field.favicon': 'Link a square icon (at least 96×96, SVG or PNG) with an absolute URL.',
  'fix.field.og:title':
    'Add og:title — it is what X, Facebook and LinkedIn print as the card headline. Without it the <title> is used.',
  'fix.field.og:description':
    'Add og:description — it drives the two or three lines printed under the headline.',
  'fix.field.og:image':
    'Add og:image with an absolute URL to a 1200×630 (1.91:1) JPEG or PNG. Without it the card renders without a picture.',
  'fix.field.og:image:alt':
    'Add og:image:alt describing the picture for screen readers and image-less clients.',
  'fix.field.og:url':
    'Add og:url with the canonical absolute URL so share counts stay on one URL.',
  'fix.field.og:type': 'Add og:type — “website” for home pages, “article” for posts.',
  'fix.field.og:site_name': 'Add og:site_name so the brand name appears on the card.',
  'fix.field.og:locale': 'Add og:locale, e.g. en_US or zh_CN.',
  'fix.field.twitter:card':
    'Set twitter:card to summary_large_image for a wide picture, or summary for a small square thumbnail.',
  'fix.field.twitter:title': 'Optional — X falls back to og:title, then <title>.',
  'fix.field.twitter:description': 'Optional — X falls back to og:description, then the meta description.',
  'fix.field.twitter:image':
    'Add twitter:image (or rely on og:image) with an absolute 1.91:1 image URL.',
  'fix.field.twitter:site': 'Add twitter:site with your @handle so the card credits the account.',
  'fix.field.twitter:creator': 'Add twitter:creator with the author @handle.',

  // -------------------------------------------------------------- preview --
  'preview.title': 'Share preview',
  'preview.platform.x': 'X',
  'preview.platform.facebook': 'Facebook',
  'preview.platform.linkedin': 'LinkedIn',
  'preview.platform.wechat': 'WeChat',
  'preview.variant.large': 'Large image',
  'preview.variant.small': 'Small image',
  'preview.variant.none': 'No image',
  'preview.variantLabel': 'Card style',
  'preview.noImage': 'No image available',
  'preview.noTitle': 'No title',
  'preview.noDescription': 'No description',
  'preview.noDomain': 'unknown domain',
  'preview.from.title': 'title from {source}',
  'preview.from.description': 'text from {source}',
  'preview.from.image': 'image from {source}',
  'preview.imageFailed': 'The preview image could not be loaded',
  'preview.imageFailedHelp':
    'The URL may be missing, hotlink-protected or blocked by CORS. The card would show a grey placeholder.',
  'preview.fullscreen': 'Open preview details',
  'preview.note': 'Simulation only — platforms cache aggressively. Re-scrape after changing tags.',

  // --------------------------------------------------------------- editor --
  'editor.title': 'Meta editor',
  'editor.subtitle': 'Edits update every preview instantly. Nothing is saved to a server.',
  'editor.reset': 'Reset to original',
  'editor.resetDone': 'Reverted to the originally inspected values.',
  'editor.dirty': '{n} edited',
  'editor.unchanged': 'Unchanged',
  'editor.upload': 'Upload image for preview',
  'editor.uploadHelp':
    'The file stays in this tab as a local blob URL and is never uploaded anywhere.',
  'editor.uploadClear': 'Remove uploaded image',
  'editor.length': '{len} characters',
  'editor.advisory': 'advisory {min}–{max}',
  'editor.fieldEmpty': 'Empty',
  'editor.jump': 'Edit',

  // ----------------------------------------------------------------- code --
  'code.title': 'Generated meta tags',
  'code.subtitle':
    'Copy this into your <head>. Values are HTML-escaped, empty fields are skipped.',
  'code.copy': 'Copy all',
  'code.copied': 'Copied',
  'code.copyOne': 'Copy this tag',
  'code.download': 'Download .html',
  'code.options': 'Include',
  'code.option.title': '<title>',
  'code.option.description': 'description',
  'code.option.canonical': 'canonical',
  'code.option.robots': 'robots',
  'code.option.viewport': 'viewport',
  'code.option.og': 'Open Graph',
  'code.option.twitter': 'X Cards',
  'code.empty': 'Nothing to generate yet — fill in a few fields first.',
  'code.tags': '{n} tags',

  // -------------------------------------------------------------- history --
  'history.title': 'Recent checks',
  'history.subtitle': 'Stored in this browser only (localStorage). Never uploaded.',
  'history.empty': 'No checks yet. Inspect a URL or paste some HTML to start.',
  'history.remove': 'Remove from history',
  'history.clear': 'Clear history',
  'history.clearConfirm': 'Delete all {n} saved checks?',
  'history.cleared': 'History cleared.',
  'history.open': 'Reopen',
  'history.score': 'Score {score}',
  'history.mode.url': 'URL',
  'history.mode.html': 'HTML',
  'history.mode.sample': 'Sample',
  'history.mode.manual': 'Manual',
  'history.count': '{n} / {max} stored',

  // ------------------------------------------------------------- settings --
  'settings.title': 'Settings',
  'settings.subtitle': 'Optional. MetaLens works without any of this.',
  'settings.endpoint': 'Fetch endpoint',
  'settings.endpointHelp':
    'URL of a self-hosted meta fetcher used by the “From URL” mode. Leave empty to skip server-side fetching. See worker/ in the repository.',
  'settings.endpointPlaceholder': 'https://metalens-fetch.example.workers.dev/fetch',
  'settings.save': 'Save',
  'settings.saved': 'Saved.',
  'settings.reset': 'Reset to default',
  'settings.invalid': 'Enter a valid http(s) URL, or leave the field empty.',
  'settings.active': 'Active endpoint',
  'settings.none': 'No endpoint configured — URL mode relies on the target’s CORS headers.',

  // --------------------------------------------------------------- report --
  'report.export': 'Export report',
  'report.markdown': 'Markdown report',
  'report.json': 'JSON data',
  'report.title': 'MetaLens report',
  'report.exported': 'Report downloaded.',

  // --------------------------------------------------------------- footer --
  'footer.built': 'Built by',
  'footer.license': 'MIT licensed',
  'footer.local': 'Client-side only',

  // --------------------------------------------------------------- common --
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.none': 'none',
  'common.unknown': 'unknown',
  'common.showMore': 'Show more',
  'common.showLess': 'Show less',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.loading': 'Loading…',
  'common.copy': 'Copy',
  'common.otherTags': 'Other meta tags in the document ({n})',
  'common.source': 'Source',
  'common.value': 'Value',
  'common.field': 'Field',
  'common.status': 'Status',
  'common.issue': 'Finding',
  'common.suggestion': 'Suggestion',
  'common.example': 'Load demo',

  // --------------------------------------------------------------- samples --
  'sample.complete.label': 'Complete meta tags',
  'sample.complete.description': 'Everything present: Open Graph, X Cards, canonical, icon.',
  'sample.noOg.label': 'Classic tags only',
  'sample.noOg.description': 'Title and description, no Open Graph, no X Cards.',
  'sample.messy.label': 'Messy real-world page',
  'sample.messy.description':
    'Duplicate tags, relative paths, noindex, invalid card type, oversized text.',

  // ------------------------------------------------------------ empty state --
  'empty.title': 'Inspect a link before you share it',
  'empty.body':
    'Paste a URL or the page HTML. MetaLens extracts every meta tag, explains what is missing, and previews the card X, Facebook, LinkedIn and WeChat would build.',
  'empty.point1': 'Parse title, description, Open Graph and X Cards',
  'empty.point2': 'Preview four platforms instantly',
  'empty.point3': 'Edit values and copy clean markup',
  'empty.trySample': 'Try the built-in demo',
};

export default en;
