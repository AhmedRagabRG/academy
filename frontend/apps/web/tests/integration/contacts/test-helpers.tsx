import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/** Retries off: a refused mutation should surface immediately in a test. */
export function CrmTestProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      {children}
    </QueryClientProvider>
  )
}
