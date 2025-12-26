'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { updateUserLastLogin } from '@/app/actions';
import { initializeNotifications } from '@/lib/notification-system';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        setLoading(false);
        setError(null);
        
        // Track user login when user signs in
        if (user) {
          try {
            await updateUserLastLogin(user.uid);
            
            // Initialize the new notification system immediately
            try {
              await initializeNotifications(user.uid);
              console.log('Notification system initialized for user:', user.uid);
            } catch (error) {
              console.error('Failed to initialize notification system:', error);
            }
          } catch (error) {
            console.error('Failed to update user last login:', error);
          }
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Auth provider error:', error);
      setError('Authentication error occurred');
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Authentication Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthLoader = ({ children }: { children: ReactNode }) => {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="flex flex-col space-y-8">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};