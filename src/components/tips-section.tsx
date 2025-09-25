
"use client";

import React, { useCallback, memo, useMemo, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { deleteTip } from '@/app/actions';
import { Tip, tipIcons } from '@/lib/types';
import { useTipsCache } from '@/hooks/use-tips-cache';
import { useTranslation } from 'react-i18next';
import { VirtualTipsList } from './virtual-tips-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AddTipDialog } from '@/components/add-tip-dialog';
import { Loader2, PlusCircle, Pencil, Trash2, Info, LucideIcon, Smartphone, Laptop, ArrowDown, Share, AppWindow, Check, BellRing, Search, Filter, Users, ChevronUp, ChevronDown, Sparkles, TrendingUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

const pwaInstallSteps = {
  android: [
    { text: "Open the app in Chrome.", icon: "chrome" },
    { text: "Tap the three-dot menu icon.", icon: "menu" },
    { text: "Select 'Install app' or 'Add to Home screen'.", icon: "install" },
    { text: "Follow the on-screen prompts to install.", icon: "check" },
    { text: "Allow notification to get updates.", icon: "notification" },
  ],
  ios: [
    { text: "Open the app in Safari.", icon: "safari" },
    { text: "Tap the 'Share' button at the bottom.", icon: "share" },
    { text: "Scroll down and tap 'Add to Home Screen'.", icon: "add" },
    { text: "Confirm by tapping 'Add' in the top-right corner.", icon: "check" },
    { text: "Allow notification to get updates.", icon: "notification" },
  ],
  desktop: [
    { text: "Open the app in a modern browser (Chrome, Edge, Firefox).", icon: "browser" },
    { text: "Look for an install icon in the address bar (usually a screen with a down arrow).", icon: "install_desktop" },
    { text: "Click the icon and then 'Install' to add it to your desktop or applications folder.", icon: "check" },
    { text: "Allow notification to get updates.", icon: "notification" },
  ],
};

const StepIcon = memo(({ iconName }: { iconName: string }) => {
    switch (iconName) {
        case 'chrome':
        case 'safari':
        case 'browser':
            return <Laptop className="h-5 w-5 text-primary" />;
        case 'menu':
            return <div className="font-bold text-primary">⋮</div>;
        case 'share':
            return <Share className="h-5 w-5 text-primary" />;
        case 'install':
        case 'install_desktop':
        case 'add':
            return <ArrowDown className="h-5 w-5 text-primary" />;
        case 'check':
            return <Check className="h-5 w-5 text-green-500" />;
        case 'notification':
            return <BellRing className="h-5 w-5 text-primary" />;
        default:
            return <div className="h-5 w-5" />;
    }
});

StepIcon.displayName = 'StepIcon';

const TipItem = memo(({ tip, user, onEdit, onDelete, t }: { 
    tip: Tip, 
    user: any, 
    onEdit: (tip: Tip) => void, 
    onDelete: (tip: Tip) => void,
    t: any 
}) => {
    const getIcon = useCallback((iconName: string): LucideIcon => {
        return tipIcons[iconName as keyof typeof tipIcons] || Info;
    }, []);

    const TipIcon = getIcon(tip.icon);
    const canEdit = user?.uid === tip.createdBy.uid;

    return (
        <AccordionItem value={`tip-${tip.id}`}>
            <AccordionTrigger>
                <div className="flex items-center gap-3 w-full">
                    <TipIcon className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 text-left">
                        <span className="font-semibold block">{t(tip.title as any, { ns: 'translation', defaultValue: tip.title })}</span>
                        <span className="text-sm text-muted-foreground">by {tip.createdBy.name || 'Anonymous'}</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-3">
                    <p className="text-sm leading-relaxed">{t(tip.content as any, { ns: 'translation', defaultValue: tip.content })}</p>
                    <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                            Created by {tip.createdBy.name || 'Anonymous'}
                        </span>
                        {canEdit && (
                            <div className="flex items-center gap-2">
                                <AddTipDialog tip={tip} onTipSaved={() => onEdit(tip)}>
                                    <Button variant="outline" size="sm"><Pencil className="mr-2 h-3 w-3" /> Edit</Button>
                                </AddTipDialog>
                                <Button variant="outline" size="sm" onClick={() => onDelete(tip)}><Trash2 className="mr-2 h-3 w-3" /> Delete</Button>
                            </div>
                        )}
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});

TipItem.displayName = 'TipItem';

const PWAInstallGuide = memo(() => {
    // Memoize the install steps to prevent re-rendering
    const androidSteps = useMemo(() => pwaInstallSteps.android.map((step, i) => (
        <li key={i} className="flex items-center gap-2">
            <StepIcon iconName={step.icon} />
            {step.text}
        </li>
    )), []);

    const iosSteps = useMemo(() => pwaInstallSteps.ios.map((step, i) => (
        <li key={i} className="flex items-center gap-2">
            <StepIcon iconName={step.icon} />
            {step.text}
        </li>
    )), []);

    const desktopSteps = useMemo(() => pwaInstallSteps.desktop.map((step, i) => (
        <li key={i} className="flex items-center gap-2">
            <StepIcon iconName={step.icon} />
            {step.text}
        </li>
    )), []);

    return (
        <AccordionItem value="pwa-install-guide">
            <AccordionTrigger>
                <div className="flex items-center gap-3">
                    <AppWindow className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-left">How to Install This App</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><Smartphone className="h-4 w-4" />Android</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground list-inside">
                        {androidSteps}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><Smartphone className="h-4 w-4" />iOS (iPhone/iPad)</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground list-inside">
                        {iosSteps}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><Laptop className="h-4 w-4" />Desktop</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground list-inside">
                        {desktopSteps}
                    </ul>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});

PWAInstallGuide.displayName = 'PWAInstallGuide';

// Add type declaration for window timeouts
declare global {
    interface Window {
        scrollTimeout?: number;
        searchTimeout?: number;
    }
}

// Debounce hook for search performance
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        if (window.searchTimeout) {
            clearTimeout(window.searchTimeout);
        }
        
        window.searchTimeout = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            if (window.searchTimeout) {
                clearTimeout(window.searchTimeout);
            }
        };
    }, [value, delay]);

    return debouncedValue;
};

// Virtualized tip item with intersection observer
const VirtualizedTipItem = memo(({ tip, user, onEdit, onDelete, t, index }: { 
    tip: Tip, 
    user: any, 
    onEdit: (tip: Tip) => void, 
    onDelete: (tip: Tip) => void,
    t: any,
    index: number
}) => {
    const [isVisible, setIsVisible] = useState(index < 3); // Show first 3 immediately
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (index < 3) return; // Skip intersection observer for first few items

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // Stop observing once visible
                }
            },
            {
                rootMargin: '50px', // Load 50px before coming into view
                threshold: 0.1
            }
        );

        if (itemRef.current) {
            observer.observe(itemRef.current);
        }

        return () => observer.disconnect();
    }, [index]);

    if (!isVisible) {
        return (
            <div 
                ref={itemRef} 
                className="h-20 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl animate-pulse flex items-center justify-center border border-border/30"
            >
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
            </div>
        );
    }

    return (
        <div ref={itemRef} className="animate-fade-in">
            <TipItem 
                tip={tip} 
                user={user} 
                onEdit={onEdit} 
                onDelete={onDelete}
                t={t}
            />
        </div>
    );
});

VirtualizedTipItem.displayName = 'VirtualizedTipItem';

export function TipsSection() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const { tips, isLoading, error, invalidateCache } = useTipsCache();
    const [deletingTip, setDeletingTip] = useState<Tip | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string>('all');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);

    // Debounce search query for better performance
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const handleDelete = useCallback(async () => {
        if (!deletingTip || !user) return;
        const result = await deleteTip(deletingTip.id, user.uid);
        if (result.success) {
            toast({ title: t('contributions.tips.delete_success') });
            invalidateCache(); // Refresh cache after deletion
        } else {
            toast({ variant: 'destructive', title: t('contributions.tips.delete_fail'), description: result.error });
        }
        setDeletingTip(null);
    }, [deletingTip, user, t, toast, invalidateCache]);

    const handleEditTip = useCallback(() => {
        invalidateCache(); // Refresh cache after edit
    }, [invalidateCache]);

    // Filter and search tips with debounced search
    const filteredTips = useMemo(() => {
        let filtered = tips;
        
        // Filter by search query (debounced)
        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.filter(tip => 
                tip.title.toLowerCase().includes(query) ||
                tip.content.toLowerCase().includes(query) ||
                (tip.createdBy.name && tip.createdBy.name.toLowerCase().includes(query))
            );
        }
        
        // Filter by icon type
        if (selectedIcon !== 'all') {
            filtered = filtered.filter(tip => tip.icon === selectedIcon);
        }
        
        return filtered;
    }, [tips, debouncedSearchQuery, selectedIcon]);

    // Get unique icons for filter
    const availableIcons = useMemo(() => {
        const icons = new Set(tips.map(tip => tip.icon));
        return Array.from(icons);
    }, [tips]);

    // Handle scroll events with improved detection
    const handleScroll = useCallback((event: Event) => {
        const target = event.target as HTMLElement;
        if (!target) return;

        const { scrollTop, scrollHeight, clientHeight } = target;
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        
        setShowScrollTop(scrollTop > 100);
        setShowScrollBottom(scrollPercentage < 0.9);
        
        setIsScrolling(true);
        if (window.scrollTimeout) {
            clearTimeout(window.scrollTimeout);
        }
        window.scrollTimeout = setTimeout(() => {
            setIsScrolling(false);
        }, 150);
    }, []);

    // Smooth scroll functions
    const scrollToTop = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }, []);

    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    // Set up scroll listener with improved handling
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            // Force initial scroll state check
            const checkInitialScroll = () => {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
                const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
                setShowScrollTop(scrollTop > 100);
                setShowScrollBottom(scrollPercentage < 0.9);
            };
            
            checkInitialScroll();
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
            
            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll, filteredTips.length]);

    // Memoize rendered tips with virtualization
    const renderedTips = useMemo(() => {
        return filteredTips.map((tip, index) => (
            <VirtualizedTipItem 
                key={tip.id} 
                tip={tip} 
                user={user} 
                onEdit={handleEditTip} 
                onDelete={setDeletingTip}
                t={t}
                index={index}
            />
        ));
    }, [filteredTips, user, handleEditTip, t]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-lg font-medium text-foreground">Loading amazing tips...</p>
                        <p className="text-sm text-muted-foreground">Preparing your personalized experience</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[400px] space-y-6 p-8">
                <div className="text-center space-y-4">
                    <div className="h-20 w-20 mx-auto bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-2xl flex items-center justify-center border border-destructive/20">
                        <Info className="h-10 w-10 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-semibold text-destructive">Oops! Something went wrong</p>
                        <p className="text-sm text-muted-foreground max-w-md">We couldn't load the tips right now. Please check your connection and try again.</p>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => invalidateCache()} 
                    className="bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20 transition-all duration-300 hover:scale-105"
                >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    {t('common.retry', { defaultValue: 'Try Again' })}
                </Button>
            </div>
        );
    }

    return (
        <>
            <Card className="h-full flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-background to-muted/20 border-border/50 shadow-lg">
                <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/50">
                    <div className="flex flex-col space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-primary/10 rounded-lg">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                        {t('contributions.tips.title')}
                                    </CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground mt-0.5">
                                        {t('contributions.tips.description')}
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5">
                                    {tips.length}
                                </Badge>
                            </div>
                            {user && (
                                <AddTipDialog onTipSaved={invalidateCache}>
                                    <Button size="sm" className="shrink-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md transition-all duration-300 hover:scale-105">
                                        <PlusCircle className="mr-1.5 h-4 w-4" />
                                        {t('contributions.tips.add_new_tip_button')}
                                    </Button>
                                </AddTipDialog>
                            )}
                        </div>
                        
                        {/* Compact Search and Filter Controls */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={t('contributions.tips.search_placeholder', { defaultValue: 'Search tips...' })}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-8 py-2 text-sm bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 hover:border-primary/30 placeholder:text-muted-foreground/70"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <select
                                    value={selectedIcon}
                                    onChange={(e) => setSelectedIcon(e.target.value)}
                                    className="bg-transparent text-sm focus:outline-none cursor-pointer text-foreground"
                                >
                                    <option value="all">{t('contributions.tips.all_categories', { defaultValue: 'All' })}</option>
                                    {availableIcons.map((icon) => (
                                        <option key={icon} value={icon}>{icon}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Compact Stats */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-background/60 rounded-md border border-border/30">
                                    <Users className="h-3 w-3 text-primary" />
                                    <span className="font-medium">{new Set(tips.map(tip => tip.createdBy.uid)).size}</span>
                                    <span className="text-muted-foreground">contributors</span>
                                </div>
                                {filteredTips.length !== tips.length && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md border border-primary/20">
                                        <TrendingUp className="h-3 w-3 text-primary" />
                                        <span className="font-medium text-primary">
                                            {filteredTips.length} of {tips.length}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                
                {/* Modern Scrollable Content Area */}
                <CardContent className="flex-1 min-h-0 p-0 relative flex flex-col">
                    {/* Enhanced Scroll Indicators */}
                    {showScrollTop && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={scrollToTop}
                            className={cn(
                                "absolute top-4 right-4 z-20 h-10 w-10 p-0 rounded-full shadow-xl transition-all duration-300",
                                "bg-background/90 backdrop-blur-md border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:scale-110",
                                "shadow-primary/20",
                                isScrolling && "animate-pulse scale-105"
                            )}
                        >
                            <ChevronUp className="h-5 w-5" />
                        </Button>
                    )}
                    
                    {showScrollBottom && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={scrollToBottom}
                            className={cn(
                                "absolute bottom-4 right-4 z-20 h-10 w-10 p-0 rounded-full shadow-xl transition-all duration-300",
                                "bg-background/90 backdrop-blur-md border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:scale-110",
                                "shadow-primary/20",
                                isScrolling && "animate-pulse scale-105"
                            )}
                        >
                            <ChevronDown className="h-5 w-5" />
                        </Button>
                    )}

                    {/* Custom Scroll Container */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex-1 px-6 py-6"
                        style={{
                            maxHeight: 'calc(100vh - 300px)'
                        }}
                    >
                        <Accordion type="single" collapsible className="space-y-2">
                            <PWAInstallGuide />
                            {filteredTips.length > 0 ? (
                                <VirtualTipsList 
                                    tips={filteredTips}
                                    user={user}
                                    onEdit={handleEditTip}
                                    onDelete={setDeletingTip}
                                    t={t}
                                    height={400}
                                />
                            ) : searchQuery || selectedIcon !== 'all' ? (
                                    <div className="text-center py-16 animate-fade-in">
                                        <div className="space-y-6">
                                            <div className="h-24 w-24 mx-auto bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl flex items-center justify-center border border-border/30">
                                                <Search className="h-12 w-12 text-muted-foreground/50" />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-xl font-semibold text-foreground">No tips found</p>
                                                <p className="text-muted-foreground max-w-md mx-auto">We couldn't find any tips matching your search criteria. Try adjusting your filters or search terms.</p>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="lg" 
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setSelectedIcon('all');
                                                }}
                                                className="bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20 transition-all duration-300 hover:scale-105"
                                            >
                                                Clear all filters
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-16 animate-fade-in">
                                        <div className="space-y-6">
                                            <div className="h-24 w-24 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                                <Sparkles className="h-12 w-12 text-primary/70" />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-xl font-semibold text-foreground">{t('contributions.tips.no_tips')}</p>
                                                <p className="text-muted-foreground max-w-md mx-auto">Share your knowledge and help others with helpful tips and tricks!</p>
                                            </div>
                                            {user && (
                                                <AddTipDialog onTipSaved={invalidateCache}>
                                                    <Button size="sm" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg transition-all duration-300 hover:scale-105">
                                                        <PlusCircle className="mr-2 h-5 w-5" />
                                                        Share your first tip
                                                    </Button>
                                                </AddTipDialog>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </Accordion>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!deletingTip} onOpenChange={() => setDeletingTip(null)}>
                <AlertDialogContent className="bg-gradient-to-br from-background to-muted/20 border-border/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl">{t('contributions.tips.delete_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-base">{t('contributions.tips.delete_confirm_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-muted/50">{t('records.cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete} 
                            className="bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive shadow-lg"
                        >
                            {t('records.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
                
                /* Custom scrollbar styling */
                .scroll-smooth {
                    scroll-behavior: smooth;
                }
                
                /* Webkit scrollbar styling */
                ::-webkit-scrollbar {
                    width: 8px;
                }
                
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: hsl(var(--primary) / 0.3);
                    border-radius: 4px;
                    transition: background 0.2s ease;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--primary) / 0.5);
                }
                
                /* Enhanced focus styles */
                .focus-visible {
                    outline: 2px solid hsl(var(--primary));
                    outline-offset: 2px;
                }
            `}</style>
        </>
    );
}
