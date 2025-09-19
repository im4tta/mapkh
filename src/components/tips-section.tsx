
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { getTips, deleteTip } from '@/app/actions';
import { Tip, tipIcons } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { AddTipDialog } from '@/components/add-tip-dialog';
import { Loader2, PlusCircle, Pencil, Trash2, Info, LucideIcon, Smartphone, Laptop, ArrowDown, Share, AppWindow, Check, BellRing } from 'lucide-react';
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
import { ScrollArea } from './ui/scroll-area';

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

const StepIcon = ({ iconName }: { iconName: string }) => {
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
};

export function TipsSection() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [tips, setTips] = useState<Tip[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingTip, setDeletingTip] = useState<Tip | null>(null);

    const fetchTips = useCallback(async () => {
        setIsLoading(true);
        const result = await getTips();
        if (result.success && result.data) {
            setTips(result.data);
        } else {
            toast({ variant: 'destructive', title: t('contributions.tips.load_error') });
        }
        setIsLoading(false);
    }, [t, toast]);

    useEffect(() => {
        fetchTips();
    }, [fetchTips]);

    const handleDelete = async () => {
        if (!deletingTip || !user) return;
        const result = await deleteTip(deletingTip.id, user.uid);
        if (result.success) {
            toast({ title: t('contributions.tips.delete_success') });
            fetchTips();
        } else {
            toast({ variant: 'destructive', title: t('contributions.tips.delete_fail'), description: result.error });
        }
        setDeletingTip(null);
    }
    
    const getIcon = (iconName: string): LucideIcon => {
        return tipIcons[iconName as keyof typeof tipIcons] || Info;
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <>
            <Card className="h-full flex flex-col flex-1">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{t('contributions.tips.title')}</CardTitle>
                            <CardDescription>{t('contributions.tips.description')}</CardDescription>
                        </div>
                         {user && (
                            <AddTipDialog onTipSaved={fetchTips}>
                                <Button size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    {t('contributions.tips.add_new_tip_button')}
                                </Button>
                            </AddTipDialog>
                         )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full pr-4 -mr-4">
                     
                        <Accordion type="single" collapsible className="w-full">
                            {/* PWA Install Guide */}
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
                                            {pwaInstallSteps.android.map((step, i) => (
                                                <li key={i} className="flex items-center gap-2"><StepIcon iconName={step.icon} />{step.text}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold flex items-center gap-2 mb-2"><Smartphone className="h-4 w-4" />iOS (iPhone/iPad)</h4>
                                        <ul className="space-y-2 text-sm text-muted-foreground list-inside">
                                            {pwaInstallSteps.ios.map((step, i) => (
                                                <li key={i} className="flex items-center gap-2"><StepIcon iconName={step.icon} />{step.text}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold flex items-center gap-2 mb-2"><Laptop className="h-4 w-4" />Desktop</h4>
                                        <ul className="space-y-2 text-sm text-muted-foreground list-inside">
                                            {pwaInstallSteps.desktop.map((step, i) => (
                                                <li key={i} className="flex items-center gap-2"><StepIcon iconName={step.icon} />{step.text}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                             {tips.length > 0 ? (
                                <>
                                    {tips.map((tip, index) => {
                                        const TipIcon = getIcon(tip.icon);
                                        const canEdit = user?.uid === tip.createdBy.uid;
                                        return (
                                        <AccordionItem value={`item-${index}`} key={tip.id}>
                                            <AccordionTrigger>
                                                <div className="flex items-center gap-3">
                                                    <TipIcon className="h-5 w-5 text-primary" />
                                                    <span className="font-semibold text-left">{t(tip.title as any, { ns: 'translation', defaultValue: tip.title })}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <p>{t(tip.content as any, { ns: 'translation', defaultValue: tip.content })}</p>
                                                {canEdit && (
                                                    <div className="flex items-center gap-2 mt-4">
                                                        <AddTipDialog tip={tip} onTipSaved={fetchTips}>
                                                            <Button variant="outline" size="sm"><Pencil className="mr-2 h-3 w-3" /> Edit</Button>
                                                        </AddTipDialog>
                                                        <Button variant="outline" size="sm" onClick={() => setDeletingTip(tip)}><Trash2 className="mr-2 h-3 w-3" /> Delete</Button>
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    )})}
                                </>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t('contributions.tips.no_tips')}
                                </div>
                            )}
                        </Accordion>
                    </ScrollArea>
                </CardContent>
            </Card>

            <AlertDialog open={!!deletingTip} onOpenChange={() => setDeletingTip(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('contributions.tips.delete_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('contributions.tips.delete_confirm_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('records.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t('records.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
