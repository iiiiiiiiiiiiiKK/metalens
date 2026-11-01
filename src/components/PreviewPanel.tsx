import { useMemo, useState } from 'react';
import { ImageOff, Info, Link2 } from 'lucide-react';
import type { Translator } from '../i18n';
import type { ImageProbe, Platform, PreviewData } from '../lib/types';
import { PLATFORMS } from '../lib/preview';
import { Panel, PanelHeader, Segmented } from './ui';

type VariantChoice = 'auto' | 'large' | 'small' | 'none';

export function PreviewPanel({
  t,
  platform,
  onPlatform,
  variant,
  onVariant,
  previews,
  probes,
  id = 'preview',
}: {
  t: Translator;
  platform: Platform;
  onPlatform: (p: Platform) => void;
  variant: VariantChoice;
  onVariant: (v: VariantChoice) => void;
  previews: Record<Platform, PreviewData> | null;
  probes: Record<string, ImageProbe>;
  id?: string;
}) {
  const preview = previews?.[platform];

  const platformItems = useMemo(
    () =>
      PLATFORMS.map((p) => ({
        value: p,
        label: t(`preview.platform.${p}`),
      })),
    [t],
  );

  const variantItems: Array<{ value: VariantChoice; label: string }> = [
    { value: 'auto', label: t('preview.variantLabel') },
    { value: 'large', label: t('preview.variant.large') },
    { value: 'small', label: t('preview.variant.small') },
    { value: 'none', label: t('preview.variant.none') },
  ];

  return (
    <Panel id={id}>
      <PanelHeader title={t('preview.title')} />
      <div className="flex flex-col gap-2.5 px-3.5 py-3 sm:px-4">
        <Segmented
          items={platformItems}
          value={platform}
          onChange={onPlatform}
          ariaLabel={t('preview.title')}
          scroll
          size="sm"
        />
        <Segmented
          items={variantItems}
          value={variant}
          onChange={onVariant}
          ariaLabel={t('preview.variantLabel')}
          scroll
          size="sm"
        />

        {preview ? (
          <div data-testid={`preview-${platform}`} className="pt-1">
            <ShareCard
              key={preview.imageUrl}
              t={t}
              preview={preview}
              probe={probes[preview.imageUrl]}
            />
          </div>
        ) : null}

        {preview ? <SourceHints t={t} preview={preview} /> : null}

        <p className="flex items-start gap-1.5 rounded-lg bg-elevated px-2 py-1.5 text-[11px] leading-relaxed text-faint">
          <Info size={11} className="mt-0.5 shrink-0" />
          <span>{t('preview.note')}</span>
        </p>
      </div>
    </Panel>
  );
}

function SourceHints({ t, preview }: { t: Translator; preview: PreviewData }) {
  const hints = [
    preview.sources.title ? t('preview.from.title', { source: preview.sources.title }) : '',
    preview.sources.description
      ? t('preview.from.description', { source: preview.sources.description })
      : '',
    preview.sources.image ? t('preview.from.image', { source: preview.sources.image }) : '',
  ].filter(Boolean);

  if (hints.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {hints.map((hint) => (
        <span
          key={hint}
          className="inline-flex max-w-full items-center gap-1 truncate rounded border border-line bg-bg px-1.5 py-0.5 font-mono text-[10px] text-faint"
        >
          {hint}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- share card -- */

function ShareCard({
  t,
  preview,
  probe,
}: {
  t: Translator;
  preview: PreviewData;
  probe?: ImageProbe;
}) {
  const [failed, setFailed] = useState(false);

  const showImage =
    preview.variant !== 'none' &&
    Boolean(preview.imageUrl) &&
    !failed &&
    probe?.status !== 'error';

  // Deterministic and honest: if the markup points at an image but the card
  // cannot render it, say so; only claim "no image" when no URL exists at all.
  const mediaMessage = preview.imageUrl ? t('preview.imageFailed') : t('preview.noImage');
  const title = preview.title || t('preview.noTitle');
  const description = preview.description;
  const domain = preview.domain || t('preview.noDomain');

  if (preview.platform === 'x') {
    return preview.variant === 'small' ? (
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-[#0f1419] shadow-sm">
        <div className="flex">
          <div className="min-w-0 flex-1 p-3">
            <p className="line-clamp-2 text-[14px] font-bold leading-snug">{title}</p>
            {description ? (
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#536471]">
                {description}
              </p>
            ) : null}
            <p className="mt-1.5 truncate text-[12px] text-[#536471]">{domain}</p>
          </div>
          <div
            className="aspect-square w-[30%] max-w-[110px] shrink-0 border-l border-black/5 bg-[#f7f9f9]"
            data-testid="card-media"
          >
            {showImage ? (
              <img
                src={preview.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <Placeholder small message="" />
            )}
          </div>
        </div>
      </div>
    ) : (
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-[#0f1419] shadow-sm">
        {preview.variant === 'large' ? (
          <div className="aspect-[1.91/1] w-full bg-[#f7f9f9]" data-testid="card-media">
            {showImage ? (
              <img
                src={preview.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <Placeholder message={mediaMessage} />
            )}
          </div>
        ) : null}
        <div className="p-3">
          <p className="line-clamp-2 text-[14px] font-bold leading-snug">{title}</p>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#536471]">
              {description}
            </p>
          ) : null}
          <p className="mt-1.5 flex items-center gap-1 truncate text-[12px] text-[#536471]">
            <Link2 size={11} />
            {domain}
          </p>
        </div>
      </div>
    );
  }

  if (preview.platform === 'facebook') {
    return (
      <div className="overflow-hidden rounded-md border border-black/10 bg-white text-[#050505] shadow-sm">
        <div className="aspect-[1.91/1] w-full bg-[#f0f2f5]">
          {showImage ? (
            <img
              src={preview.imageUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Placeholder message={mediaMessage} />
          )}
        </div>
        <div className="bg-[#f0f2f5] px-3 py-2.5">
          <p className="truncate text-[11px] uppercase tracking-wide text-[#65676b]">
            {domain}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug">{title}</p>
          {description ? (
            <p className="mt-0.5 line-clamp-1 text-[13px] leading-snug text-[#65676b]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (preview.platform === 'linkedin') {
    return (
      <div className="overflow-hidden rounded-sm border border-black/10 bg-white text-[#000000e6] shadow-sm">
        <div className="aspect-[1.91/1] w-full bg-[#eef3f8]">
          {showImage ? (
            <img
              src={preview.imageUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Placeholder message={mediaMessage} />
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{title}</p>
          <p className="mt-1 truncate text-[12px] text-[#00000099]">{domain}</p>
        </div>
      </div>
    );
  }

  // WeChat: a chat bubble with a right-hand thumbnail.
  return (
    <div className="rounded-md bg-[#e9e9eb] p-2.5">
      <div className="overflow-hidden rounded bg-white text-[#111] shadow-sm">
        <div className="flex items-start gap-2 p-2.5">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[14px] font-medium leading-snug">{title}</p>
            {description ? (
              <p className="mt-1 line-clamp-1 text-[12px] leading-snug text-[#888]">
                {description}
              </p>
            ) : null}
            <p className="mt-2 truncate text-[11px] text-[#b2b2b2]">{domain}</p>
          </div>
          <div className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded bg-[#f2f2f2]">
            {showImage ? (
              <img
                src={preview.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-1.5 pl-1 text-[10.5px] text-[#a3a3a3]">{t('app.name')}</p>
    </div>
  );
}

function Placeholder({ message, small }: { message: string; small?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#eef0f2] px-2 text-center text-[#9aa0a6]">
      {small ? null : <ImageOff size={16} />}
      {message ? <span className="text-[10.5px] leading-tight">{message}</span> : null}
    </div>
  );
}
