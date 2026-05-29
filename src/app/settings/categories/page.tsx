

"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/auth-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import { Loader2, PlusCircle, Trash2, Edit, Save, Grip, AlertCircle } from 'lucide-react';
import { getViolationTerms, getSubViolationTypes, addViolationTerm, updateViolationTerm, deleteViolationTerm, addSubViolationType, updateSubViolationType, deleteSubViolationType, seedDefaultViolationTerms, getPlaceTypes, addPlaceType, updatePlaceType, deletePlaceType, seedDefaultSubViolationTypes, removeUnwantedViolationTerms } from '@/app/actions';
import { ViolationTerm, SubViolationType, iconMap, PlaceType } from '@/lib/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const categorySchema = z.object({
  name: z.string().min(1, "Name is required."),
});

const subViolationTypeSchema = z.object({
  label: z.string().min(1, "Label is required."),
  description: z.string().optional(),
  icon: z.string().min(1, "Icon is required."),
  violationTermId: z.string().min(1, "Violation Term is required."),
});


const ManageViolationTerms = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [violationTerms, setViolationTerms] = useState<ViolationTerm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTerm, setEditingTerm] = useState<ViolationTerm | null>(null);
    const [deletingTerm, setDeletingTerm] = useState<ViolationTerm | null>(null);
    const [newTermName, setNewTermName] = useState('');

    const fetchTerms = async () => {
        setIsLoading(true);
        const result = await getViolationTerms();
        if (result.success && result.data) {
            setViolationTerms(result.data);
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsLoading(false);
    }

    useEffect(() => {
        const setup = async () => {
            if (!user?.uid) return;
            // Remove unwanted violation terms first
            await removeUnwantedViolationTerms(user.uid);
            await seedDefaultViolationTerms();
            await fetchTerms();
        }
        setup();
    }, [user?.uid]);

    const handleAddTerm = async () => {
        if (!newTermName.trim()) return;
        setIsSubmitting(true);
        const result = await addViolationTerm(newTermName.trim());
        if (result.success) {
            toast({ title: t('settings.categories.add_success') });
            setNewTermName('');
            await fetchTerms();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }
    
    const handleUpdateTerm = async () => {
        if (!editingTerm || !editingTerm.name.trim()) return;
        setIsSubmitting(true);
        const result = await updateViolationTerm(editingTerm.id, editingTerm.name.trim());
         if (result.success) {
            toast({ title: t('settings.categories.update_success') });
            setEditingTerm(null);
            await fetchTerms();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }
    
    const handleDeleteTerm = async () => {
        if (!deletingTerm) return;
        setIsSubmitting(true);
        const result = await deleteViolationTerm(deletingTerm.id);
        if (result.success) {
            toast({ title: t('settings.categories.delete_success') });
            setDeletingTerm(null);
            await fetchTerms();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }

    const handleCleanupUnwantedTerms = async () => {
        if (!user?.uid) return;
        setIsSubmitting(true);
        const result = await removeUnwantedViolationTerms(user.uid);
        if (result.success) {
            toast({ 
                title: "Cleanup Complete", 
                description: `Removed ${result.removed} unwanted violation terms.` 
            });
            await fetchTerms();
        } else {
            toast({ 
                variant: 'destructive', 
                title: "Cleanup Failed", 
                description: result.error 
            });
        }
        setIsSubmitting(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.categories.violation_terms_title')}</CardTitle>
                <CardDescription>{t('settings.categories.violation_terms_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-4">
                    <Input 
                        placeholder={t('settings.categories.add_violation_term_placeholder')}
                        value={newTermName}
                        onChange={(e) => setNewTermName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
                    />
                    <Button onClick={handleAddTerm} disabled={isSubmitting || !newTermName.trim()}>
                        {isSubmitting && !editingTerm ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {t('settings.categories.add_new')}
                    </Button>
                    <Button 
                        onClick={handleCleanupUnwantedTerms} 
                        disabled={isSubmitting}
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                        Remove Unwanted
                    </Button>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('settings.categories.name')}</TableHead>
                                <TableHead className="text-right">{t('settings.categories.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {violationTerms.map(term => (
                                <TableRow key={term.id}>
                                    <TableCell>
                                        {editingTerm?.id === term.id ? (
                                             <Input 
                                                value={editingTerm.name}
                                                onChange={(e) => setEditingTerm({...editingTerm, name: e.target.value})}
                                             />
                                        ) : (
                                            term.name
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingTerm?.id === term.id ? (
                                             <div className="flex gap-2 justify-end">
                                                <Button size="sm" onClick={handleUpdateTerm} disabled={isSubmitting}>
                                                     {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                                </Button>
                                                 <Button size="sm" variant="outline" onClick={() => setEditingTerm(null)}>{t('settings.categories.cancel')}</Button>
                                             </div>
                                        ) : (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingTerm(term)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeletingTerm(term)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                 <AlertDialog open={!!deletingTerm} onOpenChange={() => setDeletingTerm(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('settings.categories.delete_confirm')}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('settings.categories.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTerm} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{t('records.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}

const ManageSubViolationTypes = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
    const [violationTerms, setViolationTerms] = useState<ViolationTerm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<SubViolationType | null>(null);
    const [deletingType, setDeletingType] = useState<SubViolationType | null>(null);

    const form = useForm<z.infer<typeof subViolationTypeSchema>>({
        resolver: zodResolver(subViolationTypeSchema),
        defaultValues: { label: '', description: '', icon: '', violationTermId: '' },
    });

     const fetchData = async () => {
        setIsLoading(true);
        const [subTypesResult, termsResult] = await Promise.all([
            getSubViolationTypes(),
            getViolationTerms()
        ]);

        if (subTypesResult.success && subTypesResult.data) {
            setSubViolationTypes(subTypesResult.data);
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: subTypesResult.error });
        }

        if (termsResult.success && termsResult.data) {
            setViolationTerms(termsResult.data);
        } else {
             toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: termsResult.error });
        }
        setIsLoading(false);
    }

    useEffect(() => {
        const setup = async () => {
            await seedDefaultSubViolationTypes();
            await fetchData();
        }
        setup();
    }, []);

    const openDialog = (type: SubViolationType | null) => {
        setEditingType(type);
        form.reset(type || { label: '', description: '', icon: 'AlertCircle', violationTermId: '' });
        setIsDialogOpen(true);
    }

    const handleSubmit = async (values: z.infer<typeof subViolationTypeSchema>) => {
        setIsSubmitting(true);
        const result = editingType
            ? await updateSubViolationType(editingType.id, values)
            : await addSubViolationType(values);
        
        if (result.success) {
            toast({ title: editingType ? t('settings.categories.update_success') : t('settings.categories.add_success') });
            setIsDialogOpen(false);
            await fetchData();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }

    const handleDeleteType = async () => {
        if (!deletingType) return;
        setIsSubmitting(true);
        const result = await deleteSubViolationType(deletingType.id);
        if (result.success) {
            toast({ title: t('settings.categories.delete_success') });
            setDeletingType(null);
            await fetchData();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }
    
    const iconOptions = Object.keys(iconMap);

    return (
        <Card>
            <CardHeader>
                 <CardTitle>{t('settings.categories.sub_violation_types_title')}</CardTitle>
                <CardDescription>{t('settings.categories.sub_violation_types_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex justify-end mb-4">
                    <Button onClick={() => openDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('settings.categories.add_new')}
                    </Button>
                </div>
                 {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('settings.categories.icon')}</TableHead>
                                <TableHead>{t('settings.categories.label')}</TableHead>
                                <TableHead>{t('settings.categories.violation_terms_title')}</TableHead>
                                <TableHead className="text-right">{t('settings.categories.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subViolationTypes.map(type => {
                                const IconComponent = iconMap[type.icon] || AlertCircle;
                                const parentTerm = violationTerms.find(term => term.id === type.violationTermId);
                                return (
                                <TableRow key={type.id}>
                                    <TableCell><IconComponent className="h-5 w-5" /></TableCell>
                                    <TableCell>
                                        <p className="font-medium">{type.label}</p>
                                        {type.description && <p className="text-xs text-muted-foreground">{type.description}</p>}
                                    </TableCell>
                                    <TableCell>{parentTerm?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                         <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(type)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletingType(type)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingType ? 'Edit' : 'Add'} {t('records.table_header.sub_violation_type')}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                             <FormField
                                control={form.control}
                                name="violationTermId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('settings.categories.violation_terms_title')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select a violation term" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {violationTerms.map((term) => (
                                        <SelectItem key={term.id} value={term.id}>
                                            {term.name}
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="label"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('settings.categories.label')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t('settings.categories.add_sub_violation_type_placeholder')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="A short explanation of this issue type." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="icon"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('settings.categories.icon')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an icon" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {iconOptions.map(iconName => {
                                                    const Icon = iconMap[iconName];
                                                    return (
                                                         <SelectItem key={iconName} value={iconName}>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4" />
                                                                <span>{iconName}</span>
                                                            </div>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">{t('settings.categories.cancel')}</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('settings.categories.save')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.categories.delete_confirm')}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('settings.categories.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteType} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{t('records.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </Card>
    );
};

const ManagePlaceTypes = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingType, setEditingType] = useState<PlaceType | null>(null);
    const [deletingType, setDeletingType] = useState<PlaceType | null>(null);
    const [newPlaceTypeName, setNewPlaceTypeName] = useState('');

    const fetchPlaceTypes = async () => {
        setIsLoading(true);
        const result = await getPlaceTypes();
        if (result.success && result.data) {
            setPlaceTypes(result.data);
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsLoading(false);
    }
    
    useEffect(() => {
        // Seed initial place types if collection is empty
        const seedData = async () => {
            const result = await getPlaceTypes();
            if (result.success && result.data?.length === 0) {
                const defaultTypes = ["Restaurant", "School", "Hospital", "Government Office", "Border"];
                await Promise.all(defaultTypes.map(name => addPlaceType(name)));
            }
            fetchPlaceTypes();
        };
        seedData();
    }, []);

    const handleAdd = async () => {
        if (!newPlaceTypeName.trim()) return;
        setIsSubmitting(true);
        const result = await addPlaceType(newPlaceTypeName.trim());
        if (result.success) {
            toast({ title: t('settings.categories.add_success') });
            setNewPlaceTypeName('');
            await fetchPlaceTypes();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }
    
    const handleUpdate = async () => {
        if (!editingType || !editingType.name.trim()) return;
        setIsSubmitting(true);
        const result = await updatePlaceType(editingType.id, editingType.name.trim());
         if (result.success) {
            toast({ title: t('settings.categories.update_success') });
            setEditingType(null);
            await fetchPlaceTypes();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }
    
    const handleDelete = async () => {
        if (!deletingType) return;
        setIsSubmitting(true);
        const result = await deletePlaceType(deletingType.id);
        if (result.success) {
            toast({ title: t('settings.categories.delete_success') });
            setDeletingType(null);
            await fetchPlaceTypes();
        } else {
            toast({ variant: 'destructive', title: t('settings.categories.error_title'), description: result.error });
        }
        setIsSubmitting(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.categories.place_types_title')}</CardTitle>
                <CardDescription>{t('settings.categories.place_types_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-4">
                    <Input 
                        placeholder={t('settings.categories.add_place_type_placeholder')}
                        value={newPlaceTypeName}
                        onChange={(e) => setNewPlaceTypeName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button onClick={handleAdd} disabled={isSubmitting || !newPlaceTypeName.trim()}>
                        {isSubmitting && !editingType ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {t('settings.categories.add_new')}
                    </Button>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('settings.categories.name')}</TableHead>
                                <TableHead className="text-right">{t('settings.categories.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {placeTypes.map(type => (
                                <TableRow key={type.id}>
                                    <TableCell>
                                        {editingType?.id === type.id ? (
                                             <Input 
                                                value={editingType.name}
                                                onChange={(e) => setEditingType({...editingType, name: e.target.value})}
                                             />
                                        ) : (
                                            type.name
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingType?.id === type.id ? (
                                             <div className="flex gap-2 justify-end">
                                                <Button size="sm" onClick={handleUpdate} disabled={isSubmitting}>
                                                     {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                                </Button>
                                                 <Button size="sm" variant="outline" onClick={() => setEditingType(null)}>{t('settings.categories.cancel')}</Button>
                                             </div>
                                        ) : (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingType(type)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeletingType(type)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                 <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('settings.categories.delete_confirm')}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('settings.categories.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{t('records.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}



import { isAdmin } from '@/lib/admin';

export default function CategoriesSettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    
    // Admin check
    useEffect(() => {
        if (!loading && (!user || !isAdmin(user.uid))) {
            router.push('/settings');
        }
    }, [user, loading, router]);
    
    if (loading || !user || !isAdmin(user.uid)) {
        return (
            <div className="flex h-[calc(100vh_-_theme(spacing.14))] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <ManageViolationTerms />
            <ManageSubViolationTypes />
            <ManagePlaceTypes />
        </div>
    );
}
