
"use client";

import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-provider';
import { useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address."}),
    password: z.string().min(1, { message: "Password is required."}),
});

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  
  const { isSubmitting } = form.formState;

  const handleSignIn = async (values: z.infer<typeof loginSchema>) => {
      try {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        router.push('/');
      } catch (error: any) {
        console.error('Error signing in with email', error);
        let description = t('login.admin_error_generic');
        
        if (error.code === 'auth/invalid-credential') {
            description = t('login.admin_error_invalid');
        }

         toast({
          variant: 'destructive',
          title: t('login.admin_error_title'),
          description: description,
        });
      }
  }
  
  useEffect(() => {
    if (!loading && user) {
        router.push('/');
    }
  }, [user, loading, router]);


  if (loading || (!loading && user)) {
      return (
          <div className="flex items-center justify-center h-screen">
              <Loader2 className="h-10 w-10 animate-spin" />
          </div>
      )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('login.welcome_title')}</CardTitle>
          <CardDescription>
            {t('login.welcome_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div>
                 <Form {...form}>
                     <form onSubmit={form.handleSubmit(handleSignIn)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('login.email_label')}</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="admin@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                         />
                         <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel>{t('login.password_label')}</FormLabel>
                                    <Link href="/forgot-password" passHref>
                                      <Button type="button" variant="link" className="px-0 text-sm h-auto">Forgot password?</Button>
                                    </Link>
                                  </div>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                onClick={() => setShowPassword(prev => !prev)}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                         />
                         <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('login.admin_signin_button')}
                         </Button>
                     </form>
                 </Form>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-sm">
            <p className="text-muted-foreground">
                {t('login.register_prompt')}{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                    {t('login.register_link')}
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
