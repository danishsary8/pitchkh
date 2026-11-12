"use client";

import { ErrorState } from "@/components/common/states";

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} className="my-auto" />;
}
