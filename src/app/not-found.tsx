
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPinOff } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center bg-background">
      <MapPinOff className="w-24 h-24 mb-4 text-destructive" />
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
        404 - Page Not Found
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Oops! The page you're looking for doesn't exist.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Go back home</Link>
      </Button>
    </div>
  );
}
