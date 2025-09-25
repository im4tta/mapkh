
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, PlusCircle, Trash2, Edit, Calendar as CalendarIcon, Check, ChevronsUpDown, X, Users, Target, CalendarDays, MapPin, BarChart3, CheckCircle, ChevronDown, Hourglass } from 'lucide-react';
import { addTeam, getTeams, updateTeam, deleteTeam, getUsers, getAllReports } from '@/app/actions';
import { Team, UserInfo, provinces, Province, Report } from '@/lib/types';
import { useAuth } from '@/context/auth-provider';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';


const teamFormSchema = z.object({
  name: z.string().min(1, "Team name is required."),
  members: z.array(z.string()).min(1, "Please select at least one member."),
  provinces: z.array(z.custom<Province>()).min(1, "Please select at least one province."),
  goal: z.string().min(10, "Goal must be at least 10 characters long."),
  targetDate: z.date().optional(),
});
type TeamFormValues = z.infer<typeof teamFormSchema>;


const MultiSelectDialog = ({
    options,
    selected,
    onSelectedChange,
    triggerPlaceholder,
    dialogTitle,
    dialogDescription,
    searchPlaceholder,
    emptyPlaceholder,
}: {
    options: { label: string; value: string }[];
    selected: string[];
    onSelectedChange: (selected: string[]) => void;
    triggerPlaceholder: string;
    dialogTitle: string;
    dialogDescription: string;
    searchPlaceholder: string;
    emptyPlaceholder: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onSelectedChange([]);
        } else {
            onSelectedChange(options.map(option => option.value));
        }
    };
    
    const selectedLabels = options
        .filter(option => selected.includes(option.value))
        .map(option => option.label);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div className="w-full">
                     <Button variant="outline" className="w-full justify-start text-left h-auto min-h-10">
                        {selectedLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {selectedLabels.map(label => <Badge key={label} variant="secondary">{label}</Badge>)}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">{triggerPlaceholder}</span>
                        )}
                    </Button>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <Input
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                />
                <ScrollArea className="flex-1 mt-2 border rounded-md">
                    <div className="p-2">
                        <div
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                            onClick={handleSelectAll}
                        >
                            <Checkbox checked={selected.length > 0 && selected.length === options.length} />
                            <label className="font-semibold w-full cursor-pointer">Select All</label>
                        </div>
                    </div>
                    <div className="p-2">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                    onClick={() => {
                                        const newSelected = selected.includes(option.value)
                                            ? selected.filter((item) => item !== option.value)
                                            : [...selected, option.value];
                                        onSelectedChange(newSelected);
                                    }}
                                >
                                    <Checkbox
                                        checked={selected.includes(option.value)}
                                        id={`checkbox-${option.value}`}
                                    />
                                    <label
                                        htmlFor={`checkbox-${option.value}`}
                                        className="w-full cursor-pointer"
                                    >
                                        {option.label}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="p-4 text-center text-sm text-muted-foreground">{emptyPlaceholder}</p>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={() => setIsOpen(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const TeamDialog = ({
    team,
    isOpen,
    onClose,
    onSuccess,
    userList
}: {
    team: Team | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userList: UserInfo[];
}) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const isEditMode = !!team;

    const form = useForm<TeamFormValues>({
        resolver: zodResolver(teamFormSchema),
        defaultValues: {
            name: '',
            members: [],
            provinces: [],
            goal: '',
            targetDate: undefined,
        },
    });

    useEffect(() => {
        if (team && isOpen) {
            form.reset({
                name: team.name,
                members: team.members.map(m => m.uid),
                provinces: team.provinces,
                goal: team.goal,
                targetDate: team.targetDate ? new Date(team.targetDate as string) : undefined,
            });
        } else if (!team && isOpen) {
            form.reset({ name: '', members: [], provinces: [], goal: '', targetDate: undefined });
        }
    }, [team, form, isOpen]);

    const { formState: { isSubmitting }, control } = form;

    const handleSubmit = async (values: TeamFormValues) => {
        if (!currentUser) return;
        const result = isEditMode && team
            ? await updateTeam(team.id, values, currentUser.uid)
            : await addTeam(values, currentUser.uid);

        if (result.success) {
            toast({ title: isEditMode ? "Team updated" : "Team created" });
            onSuccess();
        } else {
            toast({ variant: 'destructive', title: "Operation Failed", description: result.error });
        }
    };
    
    const userOptions = useMemo(() => userList.map(u => ({ label: u.name || `User ${u.uid}`, value: u.uid || u.name! })), [userList]);
    const provinceOptions = useMemo(() => provinces.map(p => ({ label: p, value: p })), []);


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? t('teams.edit_team_title') : t('teams.create_new_team_button')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teams.group_name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('teams.group_name_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="members"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teams.members_label')}</FormLabel>
                                    <MultiSelectDialog
                                        options={userOptions}
                                        selected={field.value}
                                        onSelectedChange={field.onChange}
                                        triggerPlaceholder="Select team members..."
                                        dialogTitle="Select Members"
                                        dialogDescription="Assign users to this team."
                                        searchPlaceholder="Search for a user..."
                                        emptyPlaceholder="No users found."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="provinces"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teams.provinces_label')}</FormLabel>
                                    <MultiSelectDialog
                                        options={provinceOptions}
                                        selected={field.value}
                                        onSelectedChange={field.onChange}
                                        triggerPlaceholder="Select province permissions..."
                                        dialogTitle="Select Provinces"
                                        dialogDescription="Assign province permissions for this team."
                                        searchPlaceholder="Search for a province..."
                                        emptyPlaceholder="No provinces found."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="goal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('teams.mini_goal_label')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('teams.mini_goal_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="targetDate"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('records.table_header.target_date')}</FormLabel>
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
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">{t('teams.cancel_button')}</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? t('teams.update_team_button') : t('teams.create_teams')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


export default function TeamsPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [userList, setUserList] = useState<UserInfo[]>([]);
    const [allReports, setAllReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        const [teamsResult, usersResult, reportsResult] = await Promise.all([
            getTeams(), 
            getUsers(),
            getAllReports()
        ]);
        
        if (teamsResult.success) {
            setTeams(teamsResult.data || []);
        } else {
            toast({ variant: 'destructive', title: "Failed to load teams", description: teamsResult.error });
        }
        
        if (usersResult.success) {
            setUserList(usersResult.data || []);
        } else {
            toast({ variant: 'destructive', title: "Failed to load users", description: usersResult.error });
        }

        if (reportsResult.success) {
            setAllReports(reportsResult.data || []);
        } else {
            toast({ variant: 'destructive', title: "Failed to load reports", description: reportsResult.error });
        }
        
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (team: Team) => {
        setEditingTeam(team);
        setIsDialogOpen(true);
    }
    
    const handleAdd = () => {
        setEditingTeam(null);
        setIsDialogOpen(true);
    }

    const handleDelete = async () => {
        if (!deletingTeam || !user) return;
        const result = await deleteTeam(deletingTeam.id, user.uid);
        if (result.success) {
            toast({ title: "Team deleted" });
            fetchData();
        } else {
            toast({ variant: 'destructive', title: "Delete failed", description: result.error });
        }
        setDeletingTeam(null);
    }
    
    const handleSuccess = () => {
        setIsDialogOpen(false);
        setEditingTeam(null);
        fetchData();
    }

    const teamStats = useMemo(() => {
        const stats: Record<string, {
            total: number;
            approved: number;
            unsolved: number;
            byProvince: Record<string, { total: number; approved: number; unsolved: number }>;
        }> = {};

        teams.forEach(team => {
            const teamReports = allReports.filter(report =>
                team.provinces.includes(report.province as Province)
            );

            const byProvince: Record<string, { total: number; approved: number; unsolved: number }> = {};
            team.provinces.forEach(province => {
                byProvince[province] = { total: 0, approved: 0, unsolved: 0 };
            });

            teamReports.forEach(report => {
                if (report.province && byProvince.hasOwnProperty(report.province)) {
                    const provinceStats = byProvince[report.province];
                    provinceStats.total++;
                    if (report.status === 'approved') {
                        provinceStats.approved++;
                    } else if (report.status !== 'rejected') {
                        provinceStats.unsolved++;
                    }
                }
            });

            const totalUnsolved = teamReports.filter(r => r.status !== 'approved' && r.status !== 'rejected').length;

            stats[team.id] = {
                total: teamReports.length,
                approved: teamReports.filter(r => r.status === 'approved').length,
                unsolved: totalUnsolved,
                byProvince: byProvince,
            };
        });
        return stats;
    }, [teams, allReports]);


    if (isLoading) {
        return (
            <div className="container mx-auto py-10 px-4">
                 <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{t('teams.existing_teams_title')}</h2>
                        <p className="text-muted-foreground">{t('teams.no_teams_created')}</p>
                    </div>
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('teams.create_new_team_button')}
                    </Button>
                </div>
                {teams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map(team => (
                            <Card key={team.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{team.name}</CardTitle>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(team)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                             <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingTeam(team)}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                    <CardDescription className="flex items-center gap-2 pt-2">
                                        <Users className="h-4 w-4" /> {team.members.length} Members
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1 flex flex-col">
                                    <div className="flex-1 space-y-4">
                                         <div>
                                            <h4 className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4"/> Goal</h4>
                                            <p className="text-sm text-muted-foreground">{team.goal}</p>
                                        </div>
                                         <div>
                                            <h4 className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4"/> Target Date</h4>
                                            <p className="text-sm text-muted-foreground">{team.targetDate ? format(new Date(team.targetDate as string), 'PPP') : 'Not set'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4"/> Province Permissions</h4>
                                             <div className="flex flex-wrap gap-1 mt-1">
                                                {team.provinces.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4"/> Members</h4>
                                             <div className="flex flex-wrap gap-2 mt-1">
                                                {team.members.map(member => (
                                                    <TooltipProvider key={member.uid}>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={member.avatar || undefined} alt={member.name || 'User'} />
                                                                    <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
                                                                </Avatar>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{member.name}</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t pt-4 mt-auto">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2"><BarChart3 className="h-4 w-4"/> Statistics</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Total Reports in Provinces:</span>
                                                <span className="font-bold">{teamStats[team.id]?.total || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/>Approved Reports:</span>
                                                <span className="font-bold">{teamStats[team.id]?.approved || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground flex items-center gap-1"><Hourglass className="h-4 w-4 text-yellow-500"/>Unsolved Reports:</span>
                                                <span className="font-bold">{teamStats[team.id]?.unsolved || 0}</span>
                                            </div>
                                        </div>
                                        
                                        <Collapsible className="mt-2">
                                            <CollapsibleTrigger className="w-full flex items-center justify-center text-xs text-muted-foreground py-1 hover:bg-muted rounded-md">
                                                Details <ChevronDown className="h-4 w-4 ml-1" />
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="mt-2 space-y-2 text-xs border-t pt-2">
                                                     {teamStats[team.id] && Object.entries(teamStats[team.id].byProvince || {}).map(([province, stats]) => (
                                                        <div key={province} className="p-2 bg-muted/50 rounded-md">
                                                            <p className="font-semibold">{province}: {stats.total}</p>
                                                            <div className="flex justify-between items-center pl-2">
                                                                <span className="text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500"/>Approved:</span>
                                                                <span className="font-medium">{stats.approved}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center pl-2">
                                                                <span className="text-muted-foreground flex items-center gap-1"><Hourglass className="h-3 w-3 text-yellow-500"/>Unsolved:</span>
                                                                <span className="font-medium">{stats.unsolved}</span>
                                                            </div>
                                                        </div>
                                                     ))}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>

                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">{t('teams.no_teams_created')}</p>
                    </div>
                )}
            </div>
            
            <TeamDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={handleSuccess}
                team={editingTeam}
                userList={userList}
            />
            
             <AlertDialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('teams.delete_team_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                           {t('teams.delete_confirm_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('teams.cancel_button')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                             {t('teams.delete_button')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
