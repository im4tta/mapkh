

"use client";

import { useEffect, useState, useMemo } from 'react';
import { getUsers, deleteUser, addUserByAdmin, updateUserByAdmin, resetUserPassword } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/data-table';
import { ColumnDef, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { MoreHorizontal, Trash2, Edit, UserPlus, KeyRound, Loader2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
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
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTablePagination } from '@/components/data-table-pagination';

type UserForAdmin = {
    uid: string;
    name: string;
    email?: string;
    createdAt?: string;
    activityScore?: number;
    reports?: number;
};

const userFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().optional(),
  isEditMode: z.boolean(),
}).superRefine((data, ctx) => {
    if (!data.isEditMode && (!data.password || data.password.length < 6)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Password is required and must be at least 6 characters.",
            path: ['password'],
        });
    }
});


type UserFormValues = z.infer<typeof userFormSchema>;


const UserManagementDialog = ({
    user,
    isOpen,
    onClose,
    onSuccess,
}: {
    user: UserForAdmin | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const isEditMode = !!user;

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: { displayName: '', email: '', password: '', isEditMode: false },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                displayName: user.name,
                email: user.email,
                password: '',
                isEditMode: true,
            });
        } else {
            form.reset({ displayName: '', email: '', password: '', isEditMode: false });
        }
    }, [user, form]);
    
    const { formState: { isSubmitting } } = form;

    const handleSubmit = async (values: UserFormValues) => {
        let result;
        if (isEditMode && user) {
            const { password, ...updateValues } = values; // Exclude password for updates
            result = await updateUserByAdmin({ uid: user.uid, ...updateValues });
        } else {
            result = await addUserByAdmin({
                displayName: values.displayName,
                email: values.email,
                password: values.password!
            });
        }

        if (result.success) {
            toast({ 
                title: isEditMode ? "User updated" : "User Profile Created",
                description: isEditMode ? "User details saved." : "Please create the user in Firebase Authentication now."
            });
            onSuccess();
        } else {
            toast({ variant: 'destructive', title: "Operation Failed", description: result.error });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? t('settings.users.edit_user') : t('settings.users.add_user')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('register.display_name_label')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('register.email_label')}</FormLabel>
                                    <FormControl>
                                        <Input type="email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!isEditMode && (
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('register.password_label')}</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} value={field.value || ''}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">{t('records.cancel')}</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? t('settings.users.save_changes') : t('settings.users.add_user')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const UserActionsCell = ({ user, onEdit, onDelete, onResetPassword }: { user: UserForAdmin, onEdit: () => void, onDelete: () => void, onResetPassword: () => void }) => {
    const { t } = useTranslation();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">{t('records.open_menu')}</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                 <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('records.edit_report')}
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={onResetPassword}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    {t('settings.users.reset_password')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-500">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('records.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export default function UserManagementPage() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<UserForAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([{ id: 'activityScore', desc: true }]);
    
    // Dialog states
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserForAdmin | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserForAdmin | null>(null);
    const [resettingUser, setResettingUser] = useState<UserForAdmin | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        const result = await getUsers();
        if (result.success && result.data) {
            setUsers(result.data as UserForAdmin[]);
        } else {
            toast({
                variant: 'destructive',
                title: t('settings.users.load_error'),
                description: result.error,
            });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);
    
    const handleEdit = (user: UserForAdmin) => {
        setEditingUser(user);
        setIsUserDialogOpen(true);
    }
    
    const handleAdd = () => {
        setEditingUser(null);
        setIsUserDialogOpen(true);
    }
    
    const handleSuccess = () => {
        setIsUserDialogOpen(false);
        setEditingUser(null);
        fetchUsers(); // Refresh the user list
    }

    const handleDelete = async () => {
        if (!deletingUser) return;
        setIsSubmitting(true);
        const result = await deleteUser(deletingUser.uid);
        if (result.success) {
            toast({ title: "User deleted" });
            fetchUsers();
        } else {
             toast({ variant: 'destructive', title: "Delete failed", description: result.error });
        }
        setDeletingUser(null);
        setIsSubmitting(false);
    };
    
    const handleResetPassword = async () => {
        if (!resettingUser || !resettingUser.email) return;
        setIsSubmitting(true);
        const result = await resetUserPassword(resettingUser.email);
        if (result.success) {
            toast({ title: "Password reset email sent" });
        } else {
             toast({ variant: 'destructive', title: "Action Failed", description: result.error });
        }
        setResettingUser(null);
        setIsSubmitting(false);
    };
    
    const columns = useMemo<ColumnDef<UserForAdmin>[]>(() => [
        {
            accessorKey: 'name',
            header: t('settings.users.table_header.name'),
        },
        {
            accessorKey: 'email',
            header: t('settings.users.table_header.email'),
            cell: ({ row }) => row.original.email || 'N/A'
        },
        {
            accessorKey: 'reports',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Reports
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => row.original.reports || 0,
        },
        {
            accessorKey: 'activityScore',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Activity Score
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => row.original.activityScore || 0,
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    {t('settings.users.table_header.created_at')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const date = row.original.createdAt;
                if (!date) return 'N/A';
                const dateObj = typeof date === 'string' ? new Date(date) : (date as any).toDate();
                return format(dateObj, 'PPP');
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <UserActionsCell 
                    user={row.original}
                    onEdit={() => handleEdit(row.original)}
                    onDelete={() => setDeletingUser(row.original)}
                    onResetPassword={() => setResettingUser(row.original)}
                />
            ),
        }
    ], [t]);

    const table = useReactTable({
        data: users,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });


    if (isLoading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }
    
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-medium">{t('settings.users.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.users.description')}
                    </p>
                </div>
                <Button onClick={handleAdd}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('settings.users.add_user')}
                </Button>
            </div>
            {users.length === 0 ? (
                <p>{t('settings.users.no_users')}</p>
            ) : (
                 <div className="space-y-4">
                    <DataTable table={table} />
                    <DataTablePagination table={table} />
                </div>
            )}

            <UserManagementDialog
                isOpen={isUserDialogOpen}
                onClose={() => setIsUserDialogOpen(false)}
                user={editingUser}
                onSuccess={handleSuccess}
            />

            <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.users.confirm_delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                           {t('settings.users.confirm_delete_desc', { name: deletingUser?.name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('records.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             {t('records.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={!!resettingUser} onOpenChange={(open) => !open && setResettingUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.users.confirm_reset_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                           {t('settings.users.confirm_reset_desc', { email: resettingUser?.email })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('records.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetPassword} disabled={isSubmitting || !resettingUser?.email}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             {t('settings.users.send_reset_link')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    
