import {createAsyncComponent} from '@quilted/quilt';

const ProbablyFeature = createAsyncComponent(
  () => import('./features/ProbablyFeature.tsx'),
);

const UncommonFeature = createAsyncComponent(
  () => import('./features/UncommonFeature.tsx'),
);

export default function App() {
  return (
    <>
      <ProbablyFeature />
      <UncommonFeature />
    </>
  );
}
