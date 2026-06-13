import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { initFileBackedConsoleLogger } from "@/lib/logger";
import { initApiKeyCache } from "@/lib/ai-profiles";
import "./index.css";

initFileBackedConsoleLogger();
initApiKeyCache();

if (import.meta.env.PROD) {
  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
