import '@quilted/quilt/global';

import {createRoot} from 'react-dom/client';

import App from './App.tsx';

export async function render() {
  const element = document.querySelector('#app')!;

  createRoot(element).render(<App />);
}
