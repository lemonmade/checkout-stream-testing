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

const handler: RequestHandler = async function handler() {
  console.log(assets.entry());
  return new Response('Hello world!!!');
};

export default handler;
