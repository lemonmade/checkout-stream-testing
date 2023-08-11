import {sleep} from '@quilted/quilt';
import {
  scriptAssetPreloadAttributes,
  type RequestHandler,
} from '@quilted/quilt/server';
import {createBrowserAssets} from '@quilted/quilt/magic/assets';

// const render = createServerRender(
//   async () => {
//     const {default: App} = await import('./App.tsx');
//     return <App />;
//   },
//   {
//     assets: createBrowserAssets(),
//   },
// );

const assets = createBrowserAssets();

const handler: RequestHandler = async function handler(request) {
  const {readable, writable} = new TransformStream();

  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const write = (content: string) => writer.write(encoder.encode(content));

  const cacheKey = await assets.cacheKey?.(request);
  const [entryAssets, probablyAsyncAssets] = await Promise.all([
    assets.entry({cacheKey}),
    assets.modules(['features/ProbablyFeature.tsx'], {cacheKey}),
  ]);

  const sentAssets = new Set<string>();
  const preloadAssets = new Set<string>();

  const scriptTags: string[] = [];

  for (const asset of entryAssets.scripts) {
    if (sentAssets.has(asset.source)) continue;
    sentAssets.add(asset.source);
    scriptTags.push(
      htmlTag('script', {src: asset.source, async: true, ...asset.attributes}),
    );
  }

  write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Quilt example</title>
        ${scriptTags.join('\n')}
      </head>
      <body>
        <pre>${JSON.stringify({cacheKey, entryAssets}, null, 2)}</pre>
        <div id="first-chunk">First chunk content</div>
  `);

  const headers = new Headers({
    'Content-Type': 'text/html',
  });

  for (const asset of [
    ...entryAssets.scripts,
    ...probablyAsyncAssets.scripts,
  ]) {
    if (preloadAssets.has(asset.source)) continue;
    preloadAssets.add(asset.source);
    headers.append('Link', preloadHeader(scriptAssetPreloadAttributes(asset)));
  }

  const response = new Response(readable, {
    status: 200,
    headers,
  });

  streamResponse();

  return response;

  async function streamResponse() {
    await sleep(1000);

    write(`<div>
      <div id="second-chunk">Second chunk content</div>
      <div id="app"></div>
    </div></body></html>`);
    writer.close();
  }
};

export default handler;

function htmlTag(tag: string, attributes?: {[key: string]: string | boolean}) {
  const attributeEntries = Object.entries(attributes ?? {});
  const attributeContent =
    attributeEntries.length > 0
      ? ` ${attributeEntries
          .map(([key, value]) => (value === true ? key : `${key}="${value}"`))
          .join(' ')}`
      : ``;

  return `<${tag}${attributeContent}></${tag}>`;
}

function preloadHeader(attributes: Partial<HTMLLinkElement>) {
  const {
    as,
    rel = 'preload',
    href,
    crossOrigin,
    crossorigin,
  } = attributes as any;

  // Support both property and attribute versions of the casing
  const finalCrossOrigin = crossOrigin ?? crossorigin;

  let header = `<${href}>; rel="${rel}"; as="${as}"`;

  if (finalCrossOrigin === '' || finalCrossOrigin === true) {
    header += `; crossorigin`;
  } else if (typeof finalCrossOrigin === 'string') {
    header += `; crossorigin="${finalCrossOrigin}"`;
  }

  return header;
}
