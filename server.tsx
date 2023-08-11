import {sleep} from '@quilted/quilt';
import {type RequestHandler} from '@quilted/quilt/server';
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
  const entryAssets = await assets.entry({cacheKey});

  write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Quilt example</title>
      </head>
      <body>
        <pre>${JSON.stringify({cacheKey, entryAssets}, null, 2)}</pre>
        <div id="first-chunk">First chunk content</div>
  `);

  sleep(1000).then(() => {
    write(`<div>
      <div id="second-chunk">Second chunk content</div>
      <div id="app"></div>

      ${entryAssets.scripts
        .map((script) => `<script src="${script}"></script>`)
        .join('\n')}
    </div></body></html>`);
    writer.close();
  });

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
};

export default handler;
