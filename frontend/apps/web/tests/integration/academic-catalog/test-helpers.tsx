import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
export function CatalogTestProviders({ children }: { children: React.ReactNode }) { return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider> }
