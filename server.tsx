import {sleep} from '@quilted/quilt';
import {renderAppToResponse, type RequestHandler} from '@quilted/quilt/server';
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

  write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Quilt example</title>
      </head>
      <body>
        <pre>${JSON.stringify(
          assets.entry({
            cacheKey: await assets.cacheKey?.(request),
          }),
          null,
          2,
        )}</pre>
        <div id="first-chunk">First chunk content</div>
  `);

  sleep(1000).then(() => {
    write(`<h1>Hello world</h1></body></html>`);
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
