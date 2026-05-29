
"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();

  // Show Firebase configuration warning if not configured
  if (!isFirebaseConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Service Unavailable</CardTitle>
            <CardDescription>
              Firebase is not configured. Password reset functionality is not available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${values.email}, a password reset link has been sent to it.`,
      });
      router.push('/login');
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      // We show a generic message to prevent user enumeration attacks
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${values.email}, a password reset link has been sent to it.`,
      });
      router.push('/login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot Your Password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          </Form>
        </CardContent>
        <div className="text-center mb-6 text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
                Back to Login
            </Link>
        </div>
      </Card>
    </div>
  );
}
