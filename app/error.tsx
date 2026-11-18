'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Shown when a page fails to render (for example when the database is unreachable)
const ErrorPage = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          We could not load this page. Please try again in a moment.
        </p>
        {error.digest ? <p className="text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
