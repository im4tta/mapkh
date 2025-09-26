
"use client";

import * as React from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Report, provinces, ViolationTerm, SubViolationType, iconMap, PlaceType } from '@/lib/types';
import { submitReport, updateReport, getViolationTerms, getSubViolationTypes, getPlaceTypes, addPlaceType, uploadReportFile } from '@/app/actions';
import { findDuplicateReports, FindDuplicateReportsOutput } from '@/ai/flows/find-duplicate-reports';
import { geocodeAddress } from '@/ai/flows/geocode-address';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, AlertTriangle, Check, ChevronsUpDown, X, ChevronDown, ListChecks, MapPin, UploadCloud, File, Image as ImageIcon, Languages, Search, Pencil, Globe } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-provider';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from './ui/checkbox';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';


interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  position: google.maps.LatLngLiteral;
  report?: Report;
  province?: string;
  placeId?: string | null;
  englishName?: string;
  khmerName?: string;
  thaiName?: string;
}

const reportFormSchema = z.object({
  subViolationType: z.array(z.string()).min(1, "Please select at least one error type."),
  otherSubViolationType: z.string().optional(),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long.' }).max(500),
  province: z.string().min(1, "Province is required."),
  placeId: z.string().optional(),
  englishLanguage: z.string().optional(),
  nativeKhmerLanguage: z.string().optional(),
  thaiLanguage: z.string().optional(),
  impactCategory: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  violationTerm: z.string().optional(),
  locationWithin: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedByName: z.string().optional(),
  submittedBy: z.string().optional(),
  targetDate: z.date().optional(),
  progress: z.number().optional(),
  notes: z.string().optional(),
  driveLink: z.string().url().optional().or(z.literal('')),
}).refine(data => {
    if (data.subViolationType.includes('other') && (!data.otherSubViolationType || data.otherSubViolationType.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: 'Please specify the issue type if "General" is selected.',
    path: ['otherSubViolationType'],
});


type ReportFormValues = z.infer<typeof reportFormSchema>;

const DuplicateMap = ({ newPosition, duplicates }: { newPosition: google.maps.LatLngLiteral, duplicates: FindDuplicateReportsOutput['duplicates']}) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    return (
        <div className="h-64 w-full rounded-md overflow-hidden border my-2">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={newPosition}
                    defaultZoom={15}
                    mapId="duplicate_check_map"
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                >
                    <AdvancedMarker position={newPosition} title={"New Report"}>
                        <Pin 
                            background={'hsl(var(--primary))'}
                            borderColor={'white'}
                            glyphColor={'white'}
                        />
                    </AdvancedMarker>
                    {duplicates.map(dup => (
                         <AdvancedMarker key={dup.reportNumber} position={dup.position} title={`#${dup.reportNumber}`}>
                             <Pin 
                                background={'#ef4444'} // red-500
                                borderColor={'white'}
                                glyphColor={'white'}
                            >
                               <span className="text-white font-bold text-sm">{dup.reportNumber}</span>
                            </Pin>
                         </AdvancedMarker>
                    ))}
                </Map>
            </APIProvider>
        </div>
    )
}

export function ReportDialog({ isOpen, onClose, position, report, province, placeId, englishName, khmerName, thaiName }: ReportDialogProps) {
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const router = useRouter();
  const isEditMode = !!report;
  const { t } = useTranslation();
  const [violationTerms, setViolationTerms] = useState<ViolationTerm[]>([]);
  const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [newPlaceTypeName, setNewPlaceTypeName] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFindingPlaceId, setIsFindingPlaceId] = useState(false);
  const [isPlaceIdEditable, setIsPlaceIdEditable] = useState(false);
  
  // State for duplicate check
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<FindDuplicateReportsOutput | null>(null);
  const [formValuesForSubmission, setFormValuesForSubmission] = useState<ReportFormValues | null>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      subViolationType: [],
      otherSubViolationType: '',
      description: '',
      province: '',
      placeId: '',
      englishLanguage: '',
      nativeKhmerLanguage: '',
      thaiLanguage: '',
      impactCategory: '',
      priority: 'low',
      violationTerm: undefined,
      locationWithin: '',
      reportedBy: '',
      reportedByName: '',
      submittedBy: '',
      targetDate: undefined,
      progress: 0,
      notes: '',
      driveLink: '',
    },
  });

  const { isSubmitting } = form.formState;

  const handleClose = useCallback(() => {
    form.reset();
    setPotentialDuplicates(null);
    setFormValuesForSubmission(null);
    setIsPlaceIdEditable(false);
    onClose();
  }, [form, onClose]);
  
  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') return new Date(timestamp);
    return undefined;
  };
  
  const fetchAndSetPlaceTypes = useCallback(async () => {
    const result = await getPlaceTypes();
    if (result.success && result.data) setPlaceTypes(result.data);
  }, []);

  useEffect(() => {
    if (isOpen) {
        getViolationTerms().then(result => {
            if (result.success && result.data) setViolationTerms(result.data);
        });
        getSubViolationTypes().then(result => {
            if (result.success && result.data) setSubViolationTypes(result.data);
        });
        fetchAndSetPlaceTypes();
    }
  }, [isOpen, fetchAndSetPlaceTypes])

  useEffect(() => {
    if (isOpen) {
        if (!loading && !user) {
            toast({
                title: t('report_dialog.auth_required_title'),
                description: t('report_dialog.auth_required_description'),
                variant: 'destructive',
            });
            router.push('/login');
            handleClose();
            return;
        }

      const defaultValues = isEditMode && report ? {
        ...report,
        subViolationType: Array.isArray(report.subViolationType) ? report.subViolationType : (report.subViolationType ? [report.subViolationType] : []),
        targetDate: toDate(report.targetDate),
        progress: report.progress || 0,
        reportedByName: report.reportedByName || 'Community User',
        submittedBy: user?.displayName || user?.email || '',
        violationTerm: report.violationTerm || 'None',
        impactCategory: report.impactCategory || '',
        priority: report.priority || 'low',
        placeId: placeId ?? report.placeId, // Prioritize fresh placeId
        englishLanguage: englishName || report.englishLanguage || '',
        nativeKhmerLanguage: khmerName || report.nativeKhmerLanguage || '',
        thaiLanguage: thaiName || report.thaiLanguage || '',
      } : {
        subViolationType: [],
        otherSubViolationType: '',
        description: '',
        province: province || '',
        placeId: placeId || '',
        englishLanguage: englishName || '',
        nativeKhmerLanguage: khmerName || '',
        thaiLanguage: thaiName || '',
        impactCategory: '',
        priority: 'low' as 'low',
        violationTerm: 'None',
        locationWithin: `https://www.google.com/maps?q=${position.lat},${position.lng}`,
        reportedBy: user?.uid,
        reportedByName: user?.displayName || user?.email || 'Community User',
        submittedBy: '',
        targetDate: undefined,
        progress: 0,
        notes: '',
        driveLink: '',
        status: 'not-submitted' as 'not-submitted',
      };
      form.reset(defaultValues as ReportFormValues);
    }
  }, [isOpen, report, isEditMode, form, user, loading, toast, router, handleClose, position, province, placeId, englishName, khmerName, thaiName, t]);

  const handleAddNewPlaceType = async () => {
    if (!newPlaceTypeName.trim()) return;
    const result = await addPlaceType(newPlaceTypeName.trim());
    if (result.success) {
      toast({ title: "Place type added" });
      form.setValue('impactCategory', newPlaceTypeName);
      setNewPlaceTypeName('');
      await fetchAndSetPlaceTypes();
    } else {
      toast({ variant: 'destructive', title: "Error", description: result.error });
    }
  };
  
  const handleSuggestKhmerName = async () => {
    const thaiNameValue = form.getValues('thaiLanguage');
    if (!thaiNameValue) {
        toast({
            variant: 'destructive',
            title: "No Thai name to translate",
            description: "Please enter a name in the Thai Language field first.",
        });
        return;
    }
    setIsTranslating(true);
    try {
        const { translateText } = await import('@/ai/flows/translate-text');
        const result = await translateText({
            text: thaiNameValue,
            targetLanguage: 'km',
        });
        if (result.translatedText) {
            form.setValue('nativeKhmerLanguage', result.translatedText);
            toast({ title: "Khmer name suggested." });
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Translation Failed", 
                description: "Could not suggest a Khmer name. The Thai text has been preserved." 
            });
        }
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ 
            variant: 'destructive', 
            title: "Translation Failed", 
            description: "Could not suggest a Khmer name. The Thai text has been preserved." 
        });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSuggestEnglishName = async () => {
    const thaiNameValue = form.getValues('thaiLanguage');
    if (!thaiNameValue) {
        toast({
            variant: 'destructive',
            title: "No Thai name to translate",
            description: "Please enter a name in the Thai Language field first.",
        });
        return;
    }
    setIsTranslating(true);
    try {
        const { translateText } = await import('@/ai/flows/translate-text');
        const result = await translateText({
            text: thaiNameValue,
            targetLanguage: 'en',
        });
        if (result.translatedText) {
            form.setValue('englishLanguage', result.translatedText);
            toast({ title: "English name suggested." });
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Translation Failed", 
                description: "Could not suggest an English name. The Thai text has been preserved." 
            });
        }
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ 
            variant: 'destructive', 
            title: "Translation Failed", 
            description: "Could not suggest an English name. The Thai text has been preserved." 
        });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSuggestEnglishFromKhmer = async () => {
    const khmerNameValue = form.getValues('nativeKhmerLanguage');
    if (!khmerNameValue) {
        toast({
            variant: 'destructive',
            title: "No Khmer name to translate",
            description: "Please enter a name in the Khmer Language field first.",
        });
        return;
    }
    setIsTranslating(true);
    try {
        const { translateText } = await import('@/ai/flows/translate-text');
        const result = await translateText({
            text: khmerNameValue,
            targetLanguage: 'en',
        });
        if (result.translatedText) {
            form.setValue('englishLanguage', result.translatedText);
            toast({ title: "English name suggested from Khmer." });
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Translation Failed", 
                description: "Could not suggest an English name. The Khmer text has been preserved." 
            });
        }
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ 
            variant: 'destructive', 
            title: "Translation Failed", 
            description: "Could not suggest an English name. The Khmer text has been preserved." 
        });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSuggestKhmerFromEnglish = async () => {
    const englishNameValue = form.getValues('englishLanguage');
    if (!englishNameValue) {
        toast({
            variant: 'destructive',
            title: "No English name to translate",
            description: "Please enter a name in the English Language field first.",
        });
        return;
    }
    setIsTranslating(true);
    try {
        const { translateText } = await import('@/ai/flows/translate-text');
        const result = await translateText({
            text: englishNameValue,
            targetLanguage: 'km',
        });
        if (result.translatedText) {
            form.setValue('nativeKhmerLanguage', result.translatedText);
            toast({ title: "Khmer name suggested from English." });
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Translation Failed", 
                description: "Could not suggest a Khmer name. The English text has been preserved." 
            });
        }
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ 
            variant: 'destructive', 
            title: "Translation Failed", 
            description: "Could not suggest a Khmer name. The English text has been preserved." 
        });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSuggestThaiFromEnglish = async () => {
    const englishNameValue = form.getValues('englishLanguage');
    if (!englishNameValue) {
        toast({
            variant: 'destructive',
            title: "No English name to translate",
            description: "Please enter a name in the English Language field first.",
        });
        return;
    }
    setIsTranslating(true);
    try {
        const { translateText } = await import('@/ai/flows/translate-text');
        const result = await translateText({
            text: englishNameValue,
            targetLanguage: 'th',
        });
        if (result.translatedText) {
            form.setValue('thaiLanguage', result.translatedText);
            toast({ title: "Thai name suggested from English." });
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Translation Failed", 
                description: "Could not suggest a Thai name. The English text has been preserved." 
            });
        }
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ 
            variant: 'destructive', 
            title: "Translation Failed", 
            description: "Could not suggest a Thai name. The English text has been preserved." 
        });
    } finally {
        setIsTranslating(false);
    }
  };

  const handleSuggestThaiFromKhmer = async () => {
    const khmerNameValue = form.getValues('nativeKhmerLanguage');
    if (!khmerNameValue) {
        toast({
            variant: 'destructive',
            title: "No Khmer name to translate",
            description: "Please enter a name in the Khmer Language field first.",
        });
        return;
    }
    setIsTranslating(true);
    try {
        const { translateText } = await import('@/ai/flows/translate-text');
        const result = await translateText({
            text: khmerNameValue,
            targetLanguage: 'th',
        });
        if (result.translatedText) {
            form.setValue('thaiLanguage', result.translatedText);
            toast({ title: "Thai name suggested from Khmer." });
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Translation Failed", 
                description: "Could not suggest a Thai name. The Khmer text has been preserved." 
            });
        }
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ 
            variant: 'destructive', 
            title: "Translation Failed", 
            description: "Could not suggest a Thai name. The Khmer text has been preserved." 
        });
    } finally {
        setIsTranslating(false);
    }
  };
  
  const handleFindPlaceId = async () => {
    const name = form.getValues('englishLanguage');
    if (!name) {
        toast({
            variant: 'destructive',
            title: "No Location Name",
            description: "Please enter a name in the English Language field to find a Place ID.",
        });
        return;
    }
    setIsFindingPlaceId(true);
    try {
        const result = await geocodeAddress({ address: name });

        if (result.placeId) {
            form.setValue('placeId', result.placeId);
            toast({ title: "Place ID Found!", description: `Found and set Place ID for "${name}".` });
        } else {
            toast({ variant: 'destructive', title: "Place Not Found", description: "Could not find a result for that name." });
        }
    } catch (error) {
        console.error("Finding Place ID failed:", error);
        toast({ variant: 'destructive', title: "Error", description: "An error occurred while trying to find the Place ID." });
    } finally {
        setIsFindingPlaceId(false);
    }
  };

  // Add new state for AI translation - using existing isTranslating state

  const handleAITranslate = async (text: string, targetLang: string = 'en', fieldName: string) => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: "No text to translate",
        description: "Please enter some text first.",
      });
      return;
    }
    
    setIsTranslating(true);
    
    try {
      const { translateText } = await import('@/ai/flows/translate-text');
      const result = await translateText({
        text: text,
        targetLanguage: targetLang
      });
      
      if (result.translatedText) {
        // Update the form field with the translated text
        form.setValue(fieldName as any, result.translatedText);
        toast({
          title: "Translation successful",
          description: `Text translated to ${targetLang === 'en' ? 'English' : targetLang === 'km' ? 'Khmer' : 'Thai'}`,
        });
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        variant: 'destructive',
        title: "Translation failed",
        description: "Unable to translate text. Please try again.",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const proceedWithSubmission = async (values: ReportFormValues) => {
    const dataWithPosition = { ...values, lat: position.lat, lng: position.lng };
    
    let result;
    if (isEditMode && report) {
      result = await updateReport(report.id, dataWithPosition, user?.uid, user?.displayName, user?.email);
    } else {
      result = await submitReport(dataWithPosition, user?.uid, user?.displayName, user?.email);
    }

    if (result.success) {
      toast({ title: isEditMode ? t('report_dialog.update_success') : t('report_dialog.submit_success') });
      handleClose();
    } else if (result.errors) {
      const serverErrors = (result.errors as any)._server?.[0];
      if (serverErrors) {
          toast({
            variant: 'destructive',
            title: t('report_dialog.submission_failed_title'),
            description: serverErrors,
          });
      }
      Object.keys(result.errors).forEach((key) => {
          const fieldName = key as keyof ReportFormValues;
          const message = (result.errors as any)[fieldName]?.[0];
          if (message && form.getFieldState(fieldName)) {
              form.setError(fieldName, { type: 'server', message });
          }
      });
    } else if (result.error) {
         toast({
            variant: 'destructive',
            title: t('report_dialog.submission_failed_title'),
            description: result.error,
          });
    }
    
    // Cleanup state
    setPotentialDuplicates(null);
    setFormValuesForSubmission(null);
  }

  const handleFormSubmit = async (values: ReportFormValues) => {
      // For editing, we skip the duplicate check
      if(isEditMode) {
          await proceedWithSubmission(values);
          return;
      }
      
      setIsCheckingDuplicates(true);
      setFormValuesForSubmission(values); // Save form data
      try {
        const duplicates = await findDuplicateReports({
            description: values.description,
            lat: position.lat,
            lng: position.lng,
            placeId: values.placeId,
        });

        if(duplicates && duplicates.duplicates.length > 0) {
            setPotentialDuplicates(duplicates);
        } else {
            // No duplicates, proceed directly
            await proceedWithSubmission(values);
        }
      } catch (error) {
          console.error("Failed to check for duplicates:", error);
          toast({ variant: "destructive", title: "Could not check for duplicates. Proceeding with submission."});
          await proceedWithSubmission(values);
      } finally {
        setIsCheckingDuplicates(false);
      }
  };

  const watchedViolationTerm = form.watch("violationTerm");
  const filteredSubViolationTypes = useMemo(() => {
    if (!watchedViolationTerm || watchedViolationTerm === 'None') return [];
    const term = violationTerms.find(t => t.name === watchedViolationTerm);
    if (!term) return [];
    return subViolationTypes.filter(st => st.violationTermId === term.id);
  }, [watchedViolationTerm, subViolationTypes, violationTerms]);

  const watchedSubViolationType = form.watch("subViolationType");
  const isOtherSelected = watchedSubViolationType?.includes('other');

  const provinceOptions = provinces.map(p => ({ label: t(`provinces.${p.replace(/\s+/g, '_')}`, { defaultValue: p }), value: p }));

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {if(!open) { handleClose() }}}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('report_dialog.edit_title') : t('report_dialog.create_title')}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t('report_dialog.edit_description') : t('report_dialog.create_description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 px-1">
                <FormField
                    control={form.control}
                    name="violationTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('report_dialog.group_label')}</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('subViolationType', []); // Reset sub-violations when term changes
                        }} value={field.value} defaultValue={field.value || 'None'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('report_dialog.group_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="None">{t('report_dialog.group_none')}</SelectItem>
                            {violationTerms.map(group => (
                              <SelectItem key={group.id} value={group.name}>{t(`violation_terms.${group.name.replace(/\s+/g, '_').toLowerCase()}`, { defaultValue: group.name })}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                
                {watchedViolationTerm && watchedViolationTerm !== 'None' && (
                  <FormField
                    control={form.control}
                    name="subViolationType"
                    render={() => (
                      <FormItem>
                          <FormLabel>{t('report_dialog.issue_type_label')}</FormLabel>
                          <div className="rounded-md border p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {filteredSubViolationTypes.map((option) => {
                                  const IconComponent = iconMap[option.icon] || AlertTriangle;
                                  return (
                                  <FormField
                                      key={option.id}
                                      control={form.control}
                                      name="subViolationType"
                                      render={({ field }) => (
                                      <FormItem
                                          key={option.id}
                                          className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                          <FormControl>
                                          <Checkbox
                                              checked={field.value?.includes(option.id)}
                                              onCheckedChange={(checked) => {
                                                  return checked
                                                  ? field.onChange([...(field.value || []), option.id])
                                                  : field.onChange(
                                                      (field.value || []).filter(
                                                          (value) => value !== option.id
                                                      )
                                                      )
                                              }}
                                          />
                                          </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="font-normal flex items-center gap-2">
                                                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                                                    {t(`sub_violation_types.${option.id}`, { defaultValue: option.label })}
                                                </FormLabel>
                                                {option.description && <p className="text-xs text-muted-foreground">{option.description}</p>}
                                            </div>
                                      </FormItem>
                                      )}
                                  />
                               )})}
                          </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                  {isOtherSelected && (
                      <FormField
                        control={form.control}
                        name="otherSubViolationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('report_dialog.please_specify_label')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('report_dialog.please_specify_placeholder')} {...field} value={field.value ?? ''}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  )}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('report_dialog.description_label')}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={t('report_dialog.description_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('records.table_header.province')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('report_dialog.province_placeholder')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {provinceOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="englishLanguage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('report_dialog.english_name_label')}</FormLabel>
                                <div className="flex items-center gap-2">
                                 <FormControl>
                                     <Input placeholder={t('report_dialog.english_name_placeholder')} {...field} value={field.value ?? ''}/>
                                 </FormControl>
                                 <Button type="button" size="icon" variant="outline" onClick={() => handleAITranslate(field.value || '', 'en', 'englishName')} title="Translate to English" disabled={isTranslating}>
                        <Languages className="h-4 w-4" />
                      </Button>
                                 <Button type="button" size="icon" variant="outline" onClick={handleFindPlaceId} disabled={isFindingPlaceId}>
                                     {isFindingPlaceId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                 </Button>
                                 </div>
                                <FormMessage />
                            </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="nativeKhmerLanguage"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t('report_dialog.khmer_name_label')}</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input placeholder="ឈ្មោះជាភាសាខ្មែរ" {...field} className="font-khmer" value={field.value ?? ''} />
                                </FormControl>
                                <Button type="button" size="icon" variant="outline" onClick={() => handleAITranslate(field.value || '', 'km', 'khmerName')} title="Translate to Khmer" disabled={isTranslating}>
                        <Languages className="h-4 w-4" />
                      </Button>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="thaiLanguage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('report_dialog.thai_name_label')}</FormLabel>
                                <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input placeholder={t('report_dialog.thai_name_placeholder')} {...field} value={field.value ?? ''} />
                                </FormControl>
                                <Button type="button" size="icon" variant="outline" onClick={() => handleAITranslate(field.value || '', 'th', 'thaiName')} title="Translate to Thai" disabled={isTranslating}>
                        <Languages className="h-4 w-4" />
                      </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="placeId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Google Place ID</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input {...field} placeholder="e.g. ChIJ..." value={field.value ?? ''} readOnly={!isPlaceIdEditable} />
                                </FormControl>
                                <Button type="button" size="icon" variant="outline" onClick={() => setIsPlaceIdEditable(!isPlaceIdEditable)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="driveLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('report_dialog.drive_link_label')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('report_dialog.drive_link_placeholder')} {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  <FormField
                    control={form.control}
                    name="locationWithin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('report_dialog.location_within_label')}</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., https://www.google.com/maps?q=12.5,104.9" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="impactCategory"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{t('report_dialog.place_type_label')}</FormLabel>
                        <FormControl>
                           <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                             <div className="rounded-md border p-4 max-h-48 overflow-y-auto">
                               {placeTypes.map((type) => (
                                  <FormItem key={type.id} className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value={type.name} />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {t(`place_types.${type.name.replace(/\s+/g, '_').toLowerCase()}`, { defaultValue: type.name })}
                                    </FormLabel>
                                  </FormItem>
                                ))}
                             </div>
                          </RadioGroup>
                        </FormControl>
                        <div className="flex items-center gap-2">
                           <Input 
                              placeholder={t('settings.categories.add_place_type_placeholder')}
                              value={newPlaceTypeName}
                              onChange={(e) => setNewPlaceTypeName(e.target.value)}
                           />
                           <Button type="button" onClick={handleAddNewPlaceType} disabled={!newPlaceTypeName.trim()}>
                             {t('settings.categories.add_new')}
                           </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('report_dialog.priority_label')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('report_dialog.priority_placeholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">{t('priorities.low')}</SelectItem>
                                <SelectItem value="medium">{t('priorities.medium')}</SelectItem>
                                <SelectItem value="high">{t('priorities.high')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                            control={form.control}
                            name="progress"
                            render={({ field }) => (
                              <FormItem>
                                <div className='flex justify-between items-center'>
                                  <Label>{t('report_dialog.progress_label')}</Label>
                                  <span>{field.value || 0}%</span>
                                </div>
                                <FormControl>
                                    <Slider
                                      value={[field.value || 0]}
                                      onValueChange={(value) => field.onChange(value[0])}
                                      max={100}
                                      step={10}
                                    />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                  </div>
                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('report_dialog.target_date_label')}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="w-full"
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value) : undefined;
                              field.onChange(date);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('report_dialog.notes_label')}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={t('report_dialog.notes_placeholder')} {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="reportedByName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('report_dialog.reported_by_label')}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} disabled={isEditMode} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="submittedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('report_dialog.submitted_by_label')}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
              <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {t('report_dialog.cancel')}
                  </Button>
                <Button type="submit" disabled={isSubmitting || isCheckingDuplicates}>
                  {(isSubmitting || isCheckingDuplicates) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? t('report_dialog.update_report_button') : t('report_dialog.submit_report_button')}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!potentialDuplicates} onOpenChange={() => setPotentialDuplicates(null)}>
        <AlertDialogContent className="sm:max-w-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-yellow-500" />
                    Potential Duplicate Reports Found
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Our AI has found existing reports that seem similar to yours. Please review them on the map and in the list below. Do you still want to submit your report?
                </AlertDialogDescription>
            </AlertDialogHeader>
             {potentialDuplicates && (
                <DuplicateMap newPosition={position} duplicates={potentialDuplicates.duplicates} />
            )}
            <ScrollArea className="max-h-60 border rounded-md p-2">
                <div className="space-y-4">
                    <div className="p-2 border-b bg-muted/50 rounded-md">
                        <p className="font-semibold text-sm">Your New Report</p>
                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <p><strong>Coords:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
                        </div>
                        <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mt-1">
                            <a href={`https://www.google.com/maps?q=${position.lat},${position.lng}`} target="_blank" rel="noopener noreferrer">
                                <MapPin className="mr-1 h-3 w-3" />
                                View on Map
                            </a>
                        </Button>
                    </div>
                    {potentialDuplicates?.duplicates.map(dup => (
                        <div key={dup.reportNumber} className="p-2 border-b">
                           <div className="flex justify-between items-center">
                             <p className="font-semibold text-sm">Report #{dup.reportNumber}</p>
                             <Badge variant={dup.confidence === 'high' ? 'destructive' : 'secondary'}>{dup.confidence} confidence</Badge>
                           </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">"{dup.description}"</p>
                            <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                <p><strong>Reasoning:</strong> {dup.reasoning}</p>
                                <p><strong>Coords:</strong> {dup.position.lat.toFixed(6)}, {dup.position.lng.toFixed(6)}</p>
                            </div>
                            <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs mt-1">
                                <a href={`https://www.google.com/maps?q=${dup.position.lat},${dup.position.lng}`} target="_blank" rel="noopener noreferrer">
                                    <MapPin className="mr-1 h-3 w-3" />
                                    View on Map
                                </a>
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPotentialDuplicates(null)}>Cancel Submission</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (formValuesForSubmission) {
                        proceedWithSubmission(formValuesForSubmission);
                    }
                }}>
                    Submit Anyway
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     </>
   );
 }
