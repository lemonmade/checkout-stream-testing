import {createAsyncComponent} from '@quilted/quilt';

const ProbablyFeature = createAsyncComponent(
  () => import('./features/ProbablyFeature.tsx'),
);

const UncommonFeature = createAsyncComponent(
  () => import('./features/UncommonFeature.tsx'),
);

export default function App() {
  return (
    <div>
      <div>Rendered checkout!</div>
      <ProbablyFeature />
      <UncommonFeature />
    </div>
  );
}
