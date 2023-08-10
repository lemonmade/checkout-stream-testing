import {createProject, quiltWorkspace, quiltApp} from '@quilted/craft';
import {cloudflarePages} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(
    quiltWorkspace(),
    quiltApp({
      browser: {
        entry: './browser.tsx',
      },
      server: {
        entry: './server.tsx',
      },
    }),
    cloudflarePages(),
  );
});
