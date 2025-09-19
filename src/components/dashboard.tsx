
"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Report, LeaderboardEntry } from "@/lib/types"
import { useTranslation } from 'react-i18next';
import { Loader2, Users, Trophy, BarChart3, Clock, Waypoints, Building, Languages, UserCheck, MapPinOff, Map as MapIcon, House, Globe } from 'lucide-react';
import { DashboardDetailDialog } from './dashboard-detail-dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { DashboardHeader } from './dashboard-header';
import { getLeaderboard } from '@/app/actions';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') return new Date(timestamp);
    return undefined;
};


export function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogReports, setDialogReports] = useState<Report[]>([]);
  
  const statsAutoplayPlugin = useRef(
      Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reportsData: Report[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reportsData.push({
            id: doc.id,
            ...data,
        } as Report);
      });
      setReports(reportsData);
      
      getLeaderboard().then(res => {
          if(res.success && res.data) {
              setLeaderboard(res.data);
          }
      });

      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

    const {
        reportsByStatus,
        reportsByPriority,
        reportsByProvince,
    } = useMemo(() => {
        const statusMap: { [key in Report['status']]: Report[] } = {
            'not-submitted': [],
            'submitted': [],
            'in-review': [],
            'pending': [],
            'approved': [],
            'rejected': [],
            'archived': [],
        };
        const priorityMap: { [key: string]: Report[] } = {};
        const provinceMap: { [key: string]: Report[] } = {};

        reports.forEach(report => {
            let status = report.status;
            // Handle legacy status
            // @ts-ignore
            if (status === 'under-review') {
                status = 'in-review';
            }
            // Group by the consistent English key
            if (statusMap[status]) {
                statusMap[status].push(report);
            }

            const priority = report.priority || 'low';
            if (!priorityMap[priority]) priorityMap[priority] = [];
            priorityMap[priority].push(report);
            
            const province = report.province || 'Unknown';
            if (!provinceMap[province]) provinceMap[province] = [];
            provinceMap[province].push(report);
        });

        return {
            reportsByStatus: statusMap,
            reportsByPriority: priorityMap,
            reportsByProvince: provinceMap,
        };
    }, [reports]);

  const openDetailDialog = (title: string, data: Report[]) => {
    setDialogTitle(title);
    setDialogReports(data);
    setDialogOpen(true);
  };
  
  const challengeCards = [
      {
          icon: Building,
          title: t('dashboard.challenges.incorrect_info_title'),
          description: t('dashboard.challenges.incorrect_info_desc'),
      },
      {
          icon: Waypoints,
          title: t('dashboard.challenges.poor_road_data_title'),
          description: t('dashboard.challenges.poor_road_data_desc'),
      },
      {
          icon: House,
          title: t('dashboard.challenges.inaccurate_addresses_title'),
          description: t('dashboard.challenges.inaccurate_addresses_desc'),
      },
      {
          icon: MapIcon,
          title: t('dashboard.challenges.outdated_imagery_title'),
          description: t('dashboard.challenges.outdated_imagery_desc'),
      },
      {
          icon: Languages,
          title: t('dashboard.challenges.language_barriers_title'),
          description: t('dashboard.challenges.language_barriers_desc'),
      },
      {
          icon: UserCheck,
          title: t('dashboard.challenges.unverified_info_title'),
          description: t('dashboard.challenges.unverified_info_desc'),
      },
  ]


  if (isLoading || !isMounted) {
      return (
          <div className="flex h-[calc(100vh_-_theme(spacing.14))] w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }


  return (
    <>
    <div className="container mx-auto py-10 px-4">
      <div className="space-y-8">
        <DashboardHeader />
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main content area */}
            <div className="lg:col-span-2 space-y-6">
                 <Carousel
                    opts={{ loop: true, align: "start" }}
                    plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
                    className="w-full"
                 >
                     <CarouselContent>
                         <CarouselItem className="md:basis-1/2">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{t('dashboard.total_reports')}</CardTitle>
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reports.length}</div>
                                </CardContent>
                            </Card>
                         </CarouselItem>
                         <CarouselItem className="md:basis-1/2">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{t('dashboard.unresolved_reports')}</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reports.filter(r => r.status !== 'approved' && r.status !== 'rejected').length}</div>
                                </CardContent>
                            </Card>
                         </CarouselItem>
                     </CarouselContent>
                 </Carousel>
                
                <Card>
                    <Tabs defaultValue="status">
                        <CardHeader>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="status">{t('dashboard.reports_by_status')}</TabsTrigger>
                                <TabsTrigger value="priority">{t('dashboard.reports_by_priority')}</TabsTrigger>
                                <TabsTrigger value="province">{t('dashboard.reports_by_province')}</TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        <TabsContent value="status">
                            <CardContent>
                                <Carousel opts={{ loop: true, align: "start" }} plugins={[Autoplay({ delay: 3000, stopOnInteraction: true })]}>
                                    <CarouselContent>
                                        {Object.entries(reportsByStatus).map(([statusKey, reports]) => (
                                            <CarouselItem key={statusKey} className="md:basis-1/2 lg:basis-1/3">
                                                 <button onClick={() => openDetailDialog(t(`statuses.${statusKey}`), reports)} className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors">
                                                    <p className="text-sm text-muted-foreground">{t(`statuses.${statusKey}`)}</p>
                                                    <p className="text-2xl font-bold">{reports.length}</p>
                                                </button>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="priority">
                             <CardContent>
                                <Carousel opts={{ loop: true, align: "start" }} plugins={[Autoplay({ delay: 3500, stopOnInteraction: true })]}>
                                    <CarouselContent>
                                        {Object.entries(reportsByPriority).map(([priorityKey, reports]) => (
                                            <CarouselItem key={priorityKey} className="md:basis-1/2 lg:basis-1/3">
                                                 <button onClick={() => openDetailDialog(t(`priorities.${priorityKey}`), reports)} className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors">
                                                    <p className="text-sm text-muted-foreground">{t(`priorities.${priorityKey}`)}</p>
                                                    <p className="text-2xl font-bold">{reports.length}</p>
                                                </button>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>
                            </CardContent>
                        </TabsContent>
                         <TabsContent value="province">
                             <CardContent>
                                <Carousel opts={{ loop: true, align: "start" }} plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}>
                                    <CarouselContent>
                                        {Object.entries(reportsByProvince).map(([provinceKey, reports]) => (
                                            <CarouselItem key={provinceKey} className="md:basis-1/2 lg:basis-1/3">
                                                 <button onClick={() => openDetailDialog(t(`provinces.${provinceKey.replace(/\s+/g, '_')}`, { defaultValue: provinceKey }), reports)} className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors">
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3"/> {t(`provinces.${provinceKey.replace(/\s+/g, '_')}`, { defaultValue: provinceKey })}</p>
                                                    <p className="text-2xl font-bold">{reports.length}</p>
                                                </button>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>
                            </CardContent>
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>

            {/* Sidebar content */}
            <div className="lg:col-span-1 space-y-6">
                 <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="text-yellow-500" />
                        {t('dashboard.top_contributors')}
                    </CardTitle>
                    <CardDescription>{t('dashboard.top_contributors_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Carousel
                            opts={{ loop: true, align: "start" }}
                            plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
                            className="w-full"
                        >
                            <CarouselContent>
                                {leaderboard.slice(0, 5).map((entry, index) => (
                                <CarouselItem key={entry.id}>
                                    <div className="flex items-center gap-4 p-1">
                                        <span className="text-lg font-bold text-muted-foreground w-6 text-center">{entry.rank}</span>
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={entry.avatar || ''} alt={entry.name} />
                                            <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold truncate">{entry.name}</p>
                                            <p className="text-sm text-muted-foreground">{entry.reports} {t('contributions.leaderboard.reports')}</p>
                                        </div>
                                        {index === 0 && <Trophy className="w-8 h-8 text-yellow-500" />}
                                        {index === 1 && <Trophy className="w-8 h-8 text-gray-400" />}
                                        {index === 2 && <Trophy className="w-8 h-8 text-yellow-700" />}
                                    </div>
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="py-8 bg-slate-100 dark:bg-slate-800/20 rounded-lg">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.challenges.section_title')}</h2>
                    <p className="mt-2 text-muted-foreground">
                        {t('dashboard.challenges.section_description')}
                    </p>
                </div>
                
                 <Carousel
                    plugins={[statsAutoplayPlugin.current]}
                    onMouseEnter={statsAutoplayPlugin.current.stop}
                    onMouseLeave={statsAutoplayPlugin.current.reset}
                    opts={{ loop: true, align: "start" }}
                    className="w-full mt-8"
                >
                    <CarouselContent className="-ml-4">
                        {challengeCards.map((card, index) => (
                            <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                                <Card className="h-full">
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                         <div className="p-3 bg-primary/10 rounded-full">
                                            <card.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">{card.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{card.description}</p>
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-0" />
                    <CarouselNext className="absolute right-0"/>
                </Carousel>
            </div>
        </div>

      </div>
    </div>
    <DashboardDetailDialog 
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogTitle}
        reports={dialogReports}
    />
    </>
  );
}
