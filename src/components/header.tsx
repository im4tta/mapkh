"use client";

import Link from 'next/link';
import { Map, Cog, Database, MessageSquare, PanelLeft, LogOut, Moon, Sun, User as UserIcon, Languages, Check, Swords, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Nav } from './nav';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet';
import { useAuth } from '@/context/auth-provider';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, setDoc, Timestamp, where, updateDoc } from 'firebase/firestore';
import { NotificationsPopover } from './notifications-popover';
import { isAdmin as checkIsAdmin } from '@/lib/admin';


export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isAdmin = checkIsAdmin(user?.uid);
  const [isMounted, setIsMounted] = useState(false);
  const [unreadPosts, setUnreadPosts] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (!user || !isMounted) return;
  
    const userDocRef = doc(db, "users", user.uid);
  
    const setupUnreadListener = (lastReadDate: Date) => {
      const q = query(collection(db, "posts"), where("createdAt", ">", lastReadDate));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.filter(doc => doc.data().user.uid !== user.uid);
        setUnreadPosts(newMessages.length);
      }, (error) => {
          console.error("Error in posts snapshot listener:", error);
      });
  
      return unsubscribe;
    };
  
    const checkAndInitializeTimestamp = async () => {
      try {
        const userDoc = await getDoc(userDocRef);
        let lastReadTimestamp;
  
        if (userDoc.exists() && userDoc.data().lastReadTimestamp) {
          lastReadTimestamp = userDoc.data().lastReadTimestamp;
        } else {
          // If timestamp doesn't exist, set it to now and then use it.
          const now = Timestamp.now();
          await setDoc(userDocRef, { lastReadTimestamp: now }, { merge: true });
          lastReadTimestamp = now;
        }
        
        return setupUnreadListener(lastReadTimestamp.toDate());
      } catch (error) {
        console.error("Failed to check or initialize timestamp:", error);
        return () => {}; // Return a no-op unsubscribe function on error
      }
    };
  
    const unsubscribePromise = checkAndInitializeTimestamp();
  
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [user, isMounted]);


  const handleSignOut = async () => {
      await signOut(auth);
      router.push('/login');
  }

  const handleLanguageChange = async (lang: 'en' | 'km') => {
    i18n.changeLanguage(lang);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { language: lang }, { merge: true });
      } catch (error) {
        console.error("Failed to save language preference:", error);
      }
    }
  };

  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (user && !loading) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().language) {
          i18n.changeLanguage(userDoc.data().language);
        }
      }
    };
    fetchUserLanguage();
  }, [user, loading, i18n]);

  if (!isMounted || loading) {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
            <div className="container flex h-14 max-w-screen-2xl items-center px-4"></div>
        </header>
    )
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Map className="h-6 w-6 text-blue-600" />
            <div>
              <div className="font-bold text-lg">
                  <span className="text-blue-600">MapKH</span><span className="text-red-600">Correct</span>
              </div>
               <p className="text-xs text-muted-foreground"><span className='font-semibold text-red-600'>Fix</span> the <span className='font-semibold text-yellow-500'>Map</span>, Help the <span className='font-semibold text-blue-600'>Nation</span></p>
            </div>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-4 text-sm lg:gap-6 flex-1">
           <Nav isAdmin={isAdmin} />
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
             <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">{t('header.theme.title')}</span>
            </Button>
            {!loading && user ? (
                <>
                <NotificationsPopover />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                        <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Languages className="mr-2 h-4 w-4" />
                        <span>{t('header.language')}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                            <span className='w-4 mr-2'>{i18n.language === 'en' && <Check className="h-4 w-4" />}</span>
                            English
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleLanguageChange('km')}>
                            <span className='w-4 mr-2'>{i18n.language === 'km' && <Check className="h-4 w-4" />}</span>
                            ខ្មែរ (Khmer)
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t('header.logout')}</span>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </>
            ) : (
                <Button asChild>
                    <Link href="/login">{t('header.login')}</Link>
                </Button>
            )}
        </div>
      </div>
    </header>
  );
}