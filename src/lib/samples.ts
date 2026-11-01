export interface Sample {
  id: string;
  /** i18n key of the sample name. */
  labelKey: string;
  descriptionKey: string;
  /** Page URL the sample pretends to come from (used to resolve relative paths). */
  url: string;
  html: string;
}

const SITE = 'https://iiiiiiiiiiiiiKK.github.io/metalens';

/**
 * Built-in demo documents. They are clearly labelled as demo data in the UI and
 * exist so the product can be evaluated without network access.
 */
export const SAMPLES: Sample[] = [
  {
    id: 'complete',
    labelKey: 'sample.complete.label',
    descriptionKey: 'sample.complete.description',
    url: `${SITE}/`,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>MetaLens — See how your links look before you share</title>
    <meta name="description" content="Inspect title, description, Open Graph and X Card tags, preview the share card for X, Facebook, LinkedIn and WeChat, then copy clean markup." />
    <link rel="canonical" href="${SITE}/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="index, follow" />
    <link rel="icon" type="image/svg+xml" href="${SITE}/favicon.svg" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="MetaLens" />
    <meta property="og:title" content="MetaLens — See how your links look before you share" />
    <meta property="og:description" content="Inspect Open Graph and X Card tags, preview four platforms and export clean meta markup." />
    <meta property="og:image" content="${SITE}/og-cover.png" />
    <meta property="og:image:alt" content="MetaLens interface showing a share card preview" />
    <meta property="og:url" content="${SITE}/" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@0xkillcoin" />
    <meta name="twitter:creator" content="@0xkillcoin" />
    <meta name="twitter:title" content="MetaLens — link share preview checker" />
    <meta name="twitter:description" content="See how your links look before you share." />
    <meta name="twitter:image" content="${SITE}/og-cover.png" />
  </head>
  <body>
    <h1>MetaLens</h1>
  </body>
</html>`,
  },
  {
    id: 'no-og',
    labelKey: 'sample.noOg.label',
    descriptionKey: 'sample.noOg.description',
    url: 'https://blog.example.com/posts/build-times',
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>How we cut build times by 62%</title>
    <meta name="description" content="A practical walkthrough of the caching, code-splitting and CI changes that took our monorepo build from 14 minutes to under 6." />
  </head>
  <body>
    <h1>How we cut build times by 62%</h1>
    <p>Only the classic tags are present: no Open Graph, no X Cards.</p>
  </body>
</html>`,
  },
  {
    id: 'messy',
    labelKey: 'sample.messy.label',
    descriptionKey: 'sample.messy.description',
    url: 'https://shop.example.com/summer-2026',
    html: `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>夏季新品发布会预告：三个系列、二十七款产品与背后三年研发投入的完整说明</title>
    <title>夏季新品发布会预告</title>
    <meta name="description" content="这是我们今年最重要的一次产品更新。我们从材料、做工、包装到售后体系都做了重做，这篇文章会完整说明三个产品系列、二十七款新品、供应链改造、以及我们为什么花了三年时间才把良率从 71% 提升到 96%。如果你只想知道结论：发布会将在 9 月 12 日晚上八点开始，全程直播。" />
    <meta name="description" content="夏季新品发布会预告" />
    <meta name="robots" content="noindex, follow" />
    <meta name="viewport" content="width=1024" />
    <link rel="canonical" href="/summer-2026/" />
    <link rel="icon" href="/assets/icon.png" />
    <meta property="og:title" content="夏季新品发布会预告" />
    <meta property="og:image" content="/images/cover.jpg" />
    <meta property="og:url" content="https://shop.example.com/summer-2026" />
    <meta name="twitter:card" content="big_card" />
    <meta name="twitter:image" content="images/twitter-cover.jpg" />
  </head>
  <body>
    <h1>夏季新品发布会预告</h1>
  </body>
</html>`,
  },
];

export function getSample(id: string): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
