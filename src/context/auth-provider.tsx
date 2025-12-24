
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { updateUserLastLogin } from '@/app/actions';

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
          } catch (error) {
            console.error('Failed to update user last login:', error);
          }
        }
      }, (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Firebase auth initialization error:', error);
      setError(error instanceof Error ? error.message : 'Authentication initialization failed');
      setLoading(false);
    }
  }, []);

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

export const AuthLoader = ({children}: {children: ReactNode}) => {
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
        )
    }
    return <>{children}</>
}
