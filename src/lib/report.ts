import type { Finding, HealthResult, Locale, MetaDoc, ParseReport } from './types';
import type { Translator } from '../i18n';

export interface ReportInput {
  doc: MetaDoc;
  report: ParseReport;
  findings: Finding[];
  health: HealthResult;
  generated: string;
  locale: Locale;
  t: Translator;
  checkedAt: number;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 300);
}

/** Markdown report, ready to paste into a ticket or a PR description. */
export function buildMarkdownReport(input: ReportInput): string {
  const { doc, report, findings, health, generated, t, checkedAt } = input;
  const when = new Date(checkedAt).toISOString();
  const issues = findings.filter((f) => f.status !== 'ok');

  const lines: string[] = [];
  lines.push(`# ${t('report.title')}`);
  lines.push('');
  lines.push(
    `- ${t('common.source')}: \`${doc.sourceUrl || t('common.unknown')}\` (${report.mode})`,
  );
  lines.push(
    `- ${t('health.score')}: **${health.score}/100** (${t(`health.grade.${health.grade}`)})`,
  );
  lines.push(
    `- ${t('health.summary', {
      ok: health.counts.ok,
      warning: health.counts.warning,
      missing: health.counts.missing,
      unverified: health.counts.unverified,
    })}`,
  );
  lines.push(`- ${new Date(when).toLocaleString()}`);
  lines.push('');
  lines.push(`## ${t('nav.results')}`);
  lines.push('');
  if (issues.length === 0) {
    lines.push(t('health.noProblems'));
  } else {
    lines.push(
      `| ${t('common.field')} | ${t('common.status')} | ${t('common.issue')} | ${t('common.value')} |`,
    );
    lines.push('| --- | --- | --- | --- |');
    for (const f of issues) {
      lines.push(
        `| \`${f.field}\` | ${t(`status.${f.status}`)} | ${escapeCell(
          t(`issue.${f.code}`, f.params),
        )} | ${escapeCell(f.value) || '—'} |`,
      );
    }
  }
  lines.push('');
  lines.push(`## ${t('code.title')}`);
  lines.push('');
  lines.push('```html');
  lines.push(generated || '<!-- nothing to generate -->');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push(`_${t('app.disclaimer')}_`);
  return lines.join('\n');
}

/** Same data as JSON, for tooling. */
export function buildJsonReport(input: ReportInput): string {
  return JSON.stringify(
    {
      generator: 'MetaLens',
      checkedAt: new Date(input.checkedAt).toISOString(),
      locale: input.locale,
      sourceUrl: input.doc.sourceUrl,
      mode: input.report.mode,
      health: input.health,
      doc: input.doc,
      diagnostics: {
        duplicates: input.report.duplicates,
        emptyKeys: input.report.emptyKeys,
        foundKeys: input.report.foundKeys,
        other: input.report.other,
        truncated: input.report.truncated,
      },
      findings: input.findings,
      generated: input.generated,
    },
    null,
    2,
  );
}

/** Triggers a client-side download without touching the network. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
