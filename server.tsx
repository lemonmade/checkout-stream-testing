import {sleep, type Asset} from '@quilted/quilt';
import {createBrowserAssets} from '@quilted/quilt/magic/assets';

const assets = createBrowserAssets();

async function handler(request: Request) {
  const url = new URL(request.url);
  
  // Set up the stream we will write HTML to
  const {readable, writable} = new TextEncoderStream();
  const writer = writable.getWriter();

  // Set up the headers we will send
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    // Without this, Safari waits to receive the full streamed response before
    // loading any scripts.
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': 'upgrade-insecure-requests',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });

  // Get the list of entry assets, and lists of likely async bundles that
  // we expect to need in most cases and want to preload even before
  // we know if we need them
  const assetsCacheKey = await assets.cacheKey?.(request);
  const [entryAssets, probablyAsyncAssets] = await Promise.all([
    assets.entry({cacheKey: assetsCacheKey}),
    assets.modules(['features/ProbablyFeature.tsx'], {
      cacheKey: assetsCacheKey,
    }),
  ]);

  // Collect the asset references to include in the initial HTML document.
  // We include two lists of references:
  //
  // - `Link` headers, which are used to preload assets.
  // - `<script>` tags, which are included in the `<head>` with the `async` attribute
  //
  // When using ESM, this combination forces high-priority downloading in most
  // browsers. This combination also works around the fact that most Safari versions
  // do not support `modulepreload` headers, as the guaranteed-needed script tags are
  // still sent in the initial HTML chunk.
  const sentAssets = new Set<string>();
  const preloadAssets = new Set<string>();
  const scriptTags: string[] = [];

  function addPreloadHeader(asset: Asset) {
    if (preloadAssets.has(asset.source)) return;
    preloadAssets.add(asset.source);
    headers.append('Link', scriptPreloadHeader(asset));
  }

  function addScriptTag(asset: Asset) {
    if (sentAssets.has(asset.source)) return;
    sentAssets.add(asset.source);
    scriptTags.push(
      htmlTag('script', {src: asset.source, async: true, ...asset.attributes}),
    );
  }

  // Entry assets are always needed, so we preload them and add them
  // to the initial HTML chunk.
  for (const asset of entryAssets.scripts) {
    addPreloadHeader(asset);
    addScriptTag(asset);
  }

  // If there are async assets we think we will usually need, we can preload
  // them as well.
  for (const asset of probablyAsyncAssets.scripts) {
    addPreloadHeader(asset);
  }

  const extraFirstChunkContent = 'a'.repeat(parseNumber(url.searchParams.get('extra-content-length')) ?? 0);

  // Write our initial chunk of HTML. This flushes the content we
  // can write without any data, and the asset references.
  writer.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Quilt example</title>
        <style>
          body, html { margin: 0; padding: 0; }
        </style>
        ${scriptTags.join('\n')}
      </head>
      <body>
        <div id="first-chunk">First chunk content<div style="${url.searchParams.get('extra-content-style') ?? 'display:none'}">${extraFirstChunkContent}</div></div>
  `);

  // Start the process that will write the rest of the streamed response...
  streamResponseBody();

  // ... but return the response immediately
  const response = new Response(readable, {
    status: 200,
    headers,
  });

  return response;

  async function streamResponseBody() {
    const delay = parseNumber(url.searchParams.get('delay')) ?? 1000;
    
    // Simulate needing to fetch some data before we can render the real app
    await sleep(delay);

    // Write the rest of the HTML. This would include the actual rendered HTML,
    // as well as the minimal script that kicks of hydration of the client-side app.
    //
    // TODO: need to make the bootstrap script work with non-ESM builds
    writer.write(`
      <div id="second-chunk">Second chunk content</div>
      <div id="app"></div>
      <script type="module">
        import {render} from ${JSON.stringify(
          entryAssets.scripts[entryAssets.scripts.length - 1]!.source,
        )};

        render();
      </script>
    </body></html>`);

    // Close the stream so the response terminates in the browser
    writable.close();
  }
}

export default handler;

// Helper functions

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

function scriptPreloadHeader(asset: Asset) {
  const {source, attributes} = asset;
  const isModule = attributes?.type === 'module';

  return `<${source}>; rel="${
    isModule ? 'modulepreload' : 'preload'
  }"; as="script"`;
}

function parseNumber(maybeNumber?: string | null) {
  if (!maybeNumber) return undefined;
  const parsed = Number.parseInt(maybeNumber, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
