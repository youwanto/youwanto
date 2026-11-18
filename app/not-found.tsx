import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Image src="/images/youwanto-logo.svg" alt={`${APP_NAME} logo`} width={48} height={48} priority />
      <div className="max-w-md space-y-3">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">
          The page you were looking for does not exist, or the product is no longer available.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to the homepage</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
