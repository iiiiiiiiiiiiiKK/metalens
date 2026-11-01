import { useRef } from 'react';
import { ImagePlus, RotateCcw, X } from 'lucide-react';
import type { Translator } from '../i18n';
import { FIELDS } from '../lib/fields';
import { getByPath } from '../lib/fields';
import { LENGTH_HINTS } from '../lib/analysis';
import type { Group, MetaDoc } from '../lib/types';
import { charLength } from '../lib/url';
import { Button, Panel, PanelHeader } from './ui';

const GROUPS: Array<{ group: Group; title: string }> = [
  { group: 'basic', title: 'group.basic' },
  { group: 'og', title: 'group.og' },
  { group: 'twitter', title: 'group.twitter' },
];

const TEXTAREA_FIELDS = new Set(['description', 'og:description', 'twitter:description']);

export function EditorPanel({
  t,
  doc,
  onUpdate,
  onReset,
  isDirty,
  uploadedImage,
  onUpload,
  id = 'editor',
  focusPath,
}: {
  t: Translator;
  doc: MetaDoc;
  onUpdate: (path: string, value: string) => void;
  onReset: () => void;
  isDirty: boolean;
  uploadedImage: string | null;
  onUpload: (url: string | null) => void;
  id?: string;
  focusPath?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = FIELDS.filter((f) => f.editable);

  return (
    <Panel id={id}>
      <PanelHeader
        title={t('editor.title')}
        subtitle={t('editor.subtitle')}
        right={
          <Button variant="ghost" size="sm" onClick={onReset} disabled={!isDirty && !uploadedImage}>
            <RotateCcw size={13} />
            {t('editor.reset')}
          </Button>
        }
      />

      <div className="divide-y divide-line">
        {GROUPS.map(({ group, title }) => {
          const fields = editable.filter((f) => f.group === group);
          if (fields.length === 0) return null;
          return (
            <div key={group} className="px-3.5 py-2.5 sm:px-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {t(title)}
              </h3>
              <div className="flex flex-col gap-2.5">
                {fields.map((field) => {
                  const value = getByPath(doc, field.path);
                  const areatext = TEXTAREA_FIELDS.has(field.key);
                  const hint =
                    field.key === 'title'
                      ? LENGTH_HINTS.title
                      : field.key === 'description'
                        ? LENGTH_HINTS.description
                        : null;
                  const len = charLength(value);
                  const bad = hint ? len > hint.max || (len > 0 && len < hint.min) : false;

                  return (
                    <div key={field.key} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <label
                          htmlFor={`field-${field.key}`}
                          className="truncate font-mono text-[11.5px] font-medium text-fg"
                        >
                          {field.key}
                        </label>
                        {hint ? (
                          <span
                            className={`tnum shrink-0 text-[10.5px] ${bad ? 'text-warn' : 'text-faint'}`}
                          >
                            {t('editor.length', { len })} ·{' '}
                            {t('editor.advisory', { min: hint.min, max: hint.max })}
                          </span>
                        ) : null}
                      </div>
                      {areatext ? (
                        <textarea
                          id={`field-${field.key}`}
                          data-field={field.key}
                          value={value}
                          rows={2}
                          onChange={(e) => onUpdate(field.path, e.target.value)}
                          placeholder={t('editor.fieldEmpty')}
                          className={`w-full resize-y rounded-lg border bg-bg px-2.5 py-1.5 text-[16px] leading-relaxed text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-[13px] ${
                            focusPath === field.path ? 'border-accent ring-1 ring-accent/30' : 'border-line'
                          }`}
                        />
                      ) : (
                        <input
                          id={`field-${field.key}`}
                          data-field={field.key}
                          type="text"
                          value={value}
                          onChange={(e) => onUpdate(field.path, e.target.value)}
                          placeholder={t('editor.fieldEmpty')}
                          spellCheck={false}
                          className={`h-9 w-full rounded-lg border bg-bg px-2.5 text-[16px] text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-[13px] ${
                            focusPath === field.path ? 'border-accent ring-1 ring-accent/30' : 'border-line'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="px-3.5 py-2.5 sm:px-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
            {t('group.image')}
          </h3>
          <p className="mb-2 text-[11.5px] leading-relaxed text-muted">{t('editor.uploadHelp')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onUpload(URL.createObjectURL(file));
                e.target.value = '';
              }}
            />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={13} />
              {t('editor.upload')}
            </Button>
            {uploadedImage ? (
              <Button variant="ghost" size="sm" onClick={() => onUpload(null)}>
                <X size={13} />
                {t('editor.uploadClear')}
              </Button>
            ) : null}
          </div>
          {uploadedImage ? (
            <div className="mt-2 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImage} alt="" className="aspect-[1.91/1] w-full object-cover" />
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
