import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoordinationPage } from '../pages/coordination';
import { HomePage } from '../pages/home';
import { PrivacyPolicyPage } from '../pages/privacy';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {window.location.pathname.startsWith('/tratamiento-de-datos') ? (
        <PrivacyPolicyPage />
      ) : window.location.pathname.startsWith('/coordina') ? (
        <CoordinationPage />
      ) : (
        <HomePage />
      )}
    </QueryClientProvider>
  );
}
