
"use client";

import * as React from 'react';
import { useEffect, useState, useMemo, useRef, useCallback, ReactElement } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Report, SubViolationType, HistoryLog, Team, provinces as cambodiaProvinces, PlaceType, ViolationTerm } from "@/lib/types";
import { useTranslation } from 'react-i18next';
import { Loader2, BarChart, PieChart, LineChart as LineChartIcon, TrendingUp, CheckCircle, Clock, MapPin, AlertCircle, Group, LocateFixed, Expand, Minimize, Waypoints, Building2, TrendingDown, Users, CalendarDays, BarChart3, Hourglass, Copy, AlertTriangle, Tag, Camera, Map, Trash2, Eye, Download } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, Cell, BarChart as RechartsBarChart, PieChart as RechartsPieChart, Area, AreaChart, Line, ComposedChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, differenceInDays, parseISO, startOfMonth, isValid } from 'date-fns';
import { getSubViolationTypes, getPlaceTypes, getTeams, getHistory, getViolationTerms, getAllGeoJSONBoundaries, deleteGeoJSONBoundaries } from '../actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OSMAnalyticsMap } from '@/components/osm-analytics-map';
import { DashboardDetailDialog } from '@/components/dashboard-detail-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactCalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import 'leaflet/dist/leaflet.css';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComparisonDialog } from '@/components/comparison-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import { APIProvider } from '@vis.gl/react-google-maps';



const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#FF5733", "#C70039", "#900C3F", "#581845", "#A21232", "#D45A04", "#2E8B57", "#4682B4", "#D2691E"];

const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'string') {
        const date = parseISO(timestamp);
        if (isValid(date)) return date;
    }
    return undefined;
};

// This function is crucial for backward compatibility.
const mapLegacyReportData = (data: any): Partial<Report> => {
    const mappedData: any = {};
    
    if (data.group && !data.violationTerm) {
        mappedData.violationTerm = data.group;
    }
    if (data.errorType && !data.subViolationType) {
        mappedData.subViolationType = Array.isArray(data.errorType) ? data.errorType : [data.errorType];
    }
    
    return mappedData;
}


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 text-xs bg-background border rounded-md shadow-lg">
          <p className="font-bold">{label}</p>
          {payload.map((entry: any, index: number) => {
             const value = typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value;
             return (
                <p key={`item-${index}`} style={{ color: entry.color }}>
                    {`${entry.name}: ${value}`}
                </p>
             )
          })}
        </div>
      );
    }
    return null;
};

const provinceCoordinates: Record<string, { lat: number, lng: number }> = {
    "Banteay Meanchey": { lat: 13.75, lng: 102.95 },
    "Battambang": { lat: 13.02, lng: 102.98 },
    "Kampong Cham": { lat: 12.09, lng: 105.30 },
    "Kampong Chhnang": { lat: 12.15, lng: 104.55 },
    "Kampong Speu": { lat: 11.45, lng: 104.52 },
    "Kampong Thom": { lat: 12.79, lng: 104.99 },
    "Kampot": { lat: 10.77, lng: 104.16 },
    "Kandal": { lat: 11.48, lng: 105.00 },
    "Kep": { lat: 10.51, lng: 104.31 },
    "Koh Kong": { lat: 11.53, lng: 103.50 },
    "Kratie": { lat: 12.49, lng: 106.02 },
    "Mondulkiri": { lat: 12.46, lng: 107.19 },
    "Oddar Meanchey": { lat: 14.18, lng: 103.51 },
    "Pailin": { lat: 12.85, lng: 102.61 },
    "Phnom Penh": { lat: 11.56, lng: 104.92 },
    "Preah Sihanouk": { lat: 10.63, lng: 103.52 },
    "Preah Vihear": { lat: 13.81, lng: 104.97 },
    "Prey Veng": { lat: 11.48, lng: 105.32 },
    "Pursat": { lat: 12.26, lng: 103.81 },
    "Ratanakiri": { lat: 13.74, lng: 106.98 },
    "Siem Reap": { lat: 13.36, lng: 103.86 },
    "Stung Treng": { lat: 13.52, lng: 105.96 },
    "Svay Rieng": { lat: 11.08, lng: 105.80 },
    "Takeo": { lat: 10.98, lng: 104.78 },
    "Tboung Khmum": { lat: 11.91, lng: 105.67 },
};

const getHeatmapColor = (count: number, maxCount: number) => {
    if (count === 0) return '#e5e7eb'; // Light grey for no reports (solid color)
    
    const percentage = Math.min(count / Math.max(maxCount, 1), 1);
    
    // Create a gradient from green (120) to red (0) based on percentage
    const hue = 120 * (1 - percentage); // 120 = green, 0 = red
    const saturation = 85; // High saturation for vibrant colors
    const lightness = Math.max(30, 65 - (35 * percentage)); // from 65% down to 30%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};


const AnalyticsMap = ({ reportsByProvince, onProvinceClick }: { reportsByProvince: Record<string, Report[]>, onProvinceClick: (title: string, data: Report[]) => void }) => {
  return (
    <OSMAnalyticsMap 
      reportsByProvince={reportsByProvince} 
      onProvinceClick={onProvinceClick}
      provinceCoordinates={provinceCoordinates}
      getHeatmapColor={getHeatmapColor}
    />
  );
};


export default function AnalyticsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [history, setHistory] = useState<HistoryLog[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
    const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
    const [violationTerms, setViolationTerms] = useState<ViolationTerm[]>([]);
    const [geoJsonBoundaries, setGeoJsonBoundaries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false);
    const { t } = useTranslation();
    const { user } = useAuth();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Overview Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogReports, setDialogReports] = useState<Report[]>([]);
    
    // Comparison Dialog State
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [reportsToCompare, setReportsToCompare] = useState<Report[]>([]);
    const { toast } = useToast();
    const router = useRouter();

    const fetchGeoJSONBoundaries = useCallback(async () => {
        try {
            setIsLoadingBoundaries(true);
            const result = await getAllGeoJSONBoundaries();
            if (result.success && result.data) {
                setGeoJsonBoundaries(result.data);
            }
        } catch (error) {
            console.error('Error fetching GeoJSON boundaries:', error);
            toast({
                title: 'Error',
                description: 'Failed to load GeoJSON boundaries.',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingBoundaries(false);
        }
    }, [toast]);

    const handleDeleteBoundary = useCallback(async (id: string) => {
        if (!user?.uid) {
            toast({
                title: 'Error',
                description: 'You must be logged in to delete boundaries.',
                variant: 'destructive'
            });
            return;
        }
        try {
            const result = await deleteGeoJSONBoundaries(id, user.uid);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'GeoJSON boundary deleted successfully.',
                });
                fetchGeoJSONBoundaries();
            } else {
                throw new Error(result.error || 'Failed to delete boundary');
            }
        } catch (error) {
            console.error('Error deleting boundary:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete boundary.',
                variant: 'destructive'
            });
        }
    }, [toast, fetchGeoJSONBoundaries, user]);

    const handleDownloadGeoJSON = useCallback((boundary: any) => {
        const dataStr = JSON.stringify(boundary.geoJsonData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${boundary.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.geojson`;
        link.click();
        URL.revokeObjectURL(url);
        toast({
            title: 'Download Started',
            description: 'GeoJSON file download has started.',
        });
    }, [toast]);

    const fetchInitialData = useCallback(async () => {
        try {
            const [typesResult, placeTypesResult, violationTermsResult, teamsResult, historyResult] = await Promise.all([
                getSubViolationTypes(),
                getPlaceTypes(),
                getViolationTerms(),
                getTeams(),
                getHistory({ entityType: 'all'})
            ]);

            if (typesResult.success && typesResult.data) setSubViolationTypes(typesResult.data);
            if (placeTypesResult.success && placeTypesResult.data) setPlaceTypes(placeTypesResult.data);
            if (violationTermsResult.success && violationTermsResult.data) setViolationTerms(violationTermsResult.data);
            if (teamsResult.success && teamsResult.data) setTeams(teamsResult.data);
            if (historyResult.success && historyResult.data) setHistory(historyResult.data);

            const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const reportsData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const legacyMappings = mapLegacyReportData(data);
                    return { id: doc.id, ...data, ...legacyMappings } as Report;
                });
                setReports(reportsData);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching reports:", error);
                setIsLoading(false);
            });
            
            return unsubscribe;
        } catch (error) {
             console.error("Error fetching initial data:", error);
             setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        setIsLoading(true);
        let unsubscribe: (() => void) | undefined;
        const init = async () => {
            const result = await fetchInitialData();
            if (result) {
                unsubscribe = result;
            }
            fetchGeoJSONBoundaries();
        }
        init();
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [fetchInitialData, fetchGeoJSONBoundaries]);

    const analyticsData = useMemo(() => {
        if (reports.length === 0) return null;

        // --- Overview Tab ---
        const reportsByMonth = reports.reduce((acc, report) => {
            const date = toDate(report.createdAt);
            if(date) {
                const month = format(date, 'yyyy-MM');
                if (!acc[month]) acc[month] = { reports: 0 };
                acc[month].reports++;
            }
            return acc;
        }, {} as Record<string, { reports: number }>);

        const chartDataByMonth = Object.keys(reportsByMonth).map(month => ({
            name: format(new Date(month), 'MMM yy'),
            reports: reportsByMonth[month].reports,
        })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        const reportsByProvince: Record<string, Report[]> = {};
        cambodiaProvinces.forEach(p => reportsByProvince[p] = []);
        reports.forEach(report => {
            const province = report.province || 'Unknown';
            if (reportsByProvince[province]) {
              reportsByProvince[province].push(report);
            } else {
              reportsByProvince[province] = [report];
            }
        });

        const createDistributionData = (key: keyof Report, defaultLabel: string, translationPrefix?: string) => {
             const dataMap = reports.reduce((acc, report) => {
                let value: any = report[key];
                if (key === 'status' && value === 'under-review') value = 'in-review';

                if (Array.isArray(value)) {
                    value.forEach(v => {
                        const label = translationPrefix ? t(`${translationPrefix}.${v}`, { defaultValue: v }) : v || defaultLabel;
                        if (!acc[label]) acc[label] = 0;
                        acc[label]++;
                    })
                } else {
                    const label = translationPrefix ? t(`${translationPrefix}.${value || defaultLabel}`, { defaultValue: value || defaultLabel}) : value || defaultLabel;
                    if (!acc[label]) acc[label] = 0;
                    acc[label]++;
                }
                return acc;
            }, {} as Record<string, number>);

            return Object.keys(dataMap).map(name => ({ name, value: dataMap[name] }));
        };
        
        const getSubViolationTypeLabel = (id: string | undefined) => {
            if (!id) return "General";
            const foundType = subViolationTypes.find(it => it.id === id);
            return t(`sub_violation_types.${id}`, { defaultValue: foundType?.label || id });
        };
        
        // --- Advanced Tab ---
        const resolvedReports = reports.filter(report => {
            const createdAtDate = toDate(report.createdAt);
            const resolvedAtDate = toDate(report.resolvedAt);
            return (report.status === 'approved' || report.status === 'rejected') && createdAtDate && resolvedAtDate;
        });

        const approvalRateByProvince = Object.entries(reportsByProvince).map(([province, provReports]) => {
            const total = provReports.length;
            if (total === 0) return { name: province, Approved: 0, Rejected: 0 };
            const approved = provReports.filter(r => r.status === 'approved').length;
            const rejected = provReports.filter(r => r.status === 'rejected').length;
            return { name: province, Approved: (approved / total) * 100, Rejected: (rejected / total) * 100 };
        });

        const activityByDay: Record<string, number> = {};
        history.forEach(log => {
            const date = toDate(log.createdAt);
            if (date) {
                const day = format(date, 'yyyy-MM-dd');
                activityByDay[day] = (activityByDay[day] || 0) + 1;
            }
        });

        const teamStats = teams.map(team => {
            const teamReports = reports.filter(report => team.provinces.includes(report.province as any));
            const resolvedTeamReports = teamReports.filter(r => (r.status === 'approved' || r.status === 'rejected') && toDate(r.createdAt) && toDate(r.resolvedAt));
            const totalResolutionDays = resolvedTeamReports.reduce((acc, report) => {
                const resolvedDate = toDate(report.resolvedAt)!;
                const createdDate = toDate(report.createdAt)!;
                return acc + differenceInDays(resolvedDate, createdDate);
            }, 0);
            
            return {
                name: team.name,
                resolved: resolvedTeamReports.length,
                avgTime: resolvedTeamReports.length > 0 ? totalResolutionDays / resolvedTeamReports.length : 0,
                unresolved: teamReports.length - resolvedTeamReports.length,
            };
        });
        
        const verificationAnalysis = reports.reduce((acc, report) => {
            const key = report.verifications?.length || 0;
            if (!acc[key]) acc[key] = { total: 0, approved: 0 };
            acc[key].total++;
            if (report.status === 'approved') {
                acc[key].approved++;
            }
            return acc;
        }, {} as Record<number, { total: number; approved: number }>);
        
        const verificationChartData = Object.entries(verificationAnalysis).map(([verifications, data]) => ({
            name: `${verifications} Verifications`,
            'Approval Rate': data.total > 0 ? (data.approved / data.total) * 100 : 0,
            'Total Reports': data.total,
        }));

        const subViolationTypeTrends = reports.reduce((acc, report) => {
            const date = toDate(report.createdAt);
            if (!date) return acc;
            const month = format(startOfMonth(date), 'yyyy-MM-dd');
            if (!acc[month]) {
                acc[month] = { name: format(startOfMonth(date), 'MMM yy') };
                subViolationTypes.forEach(it => acc[month][getSubViolationTypeLabel(it.id)] = 0);
            }
            const errorTypeIds = Array.isArray(report.subViolationType) ? report.subViolationType : [report.subViolationType];
            errorTypeIds?.forEach(etId => {
                const label = getSubViolationTypeLabel(etId);
                if(acc[month][label] !== undefined) acc[month][label]++;
            })
            return acc;
        }, {} as Record<string, any>);

        const placeTypeTrends = reports.reduce((acc, report) => {
            const date = toDate(report.createdAt);
            if (!date) return acc;
            const month = format(startOfMonth(date), 'yyyy-MM-dd');
            if (!acc[month]) {
                acc[month] = { name: format(startOfMonth(date), 'MMM yy') };
                placeTypes.forEach(pt => acc[month][pt.name] = 0);
                acc[month]['Other'] = 0;
            }
            const placeType = report.impactCategory;
            if (placeType && acc[month][placeType] !== undefined) {
                acc[month][placeType]++;
            } else if (placeType) {
                 if(acc[month]['Other'] === undefined) acc[month]['Other'] = 0;
                 acc[month]['Other']++;
            }
            return acc;
        }, {} as Record<string, any>);
        
        const groupTrends = reports.reduce((acc, report) => {
            const date = toDate(report.createdAt);
            if (!date) return acc;
            const month = format(startOfMonth(date), 'yyyy-MM-dd');
            if (!acc[month]) {
                acc[month] = { name: format(startOfMonth(date), 'MMM yy') };
                violationTerms.forEach(rg => acc[month][rg.name] = 0);
                acc[month]['Unassigned'] = 0;
            }
            const group = report.violationTerm;
            if (group && acc[month][group] !== undefined) {
                acc[month][group]++;
            } else if (group) {
                 if(acc[month]['Unassigned'] === undefined) acc[month]['Unassigned'] = 0;
                 acc[month]['Unassigned']++;
            }
            return acc;
        }, {} as Record<string, any>);
        
        const createBreakdownByProvince = (
            categoryKey: 'subViolationType' | 'impactCategory' | 'violationTerm' | 'keywords', 
            allCategories: { id?: string, name: string }[] | { id: string, label: string }[] | string[],
            defaultCategory: string
        ) => {
            const provinceData: { [province: string]: { [category: string]: number } } = {};

            reports.forEach(report => {
                const province = report.province || 'Unknown';
                if (!provinceData[province]) provinceData[province] = {};

                let categories: any[] = report[categoryKey] ? (Array.isArray(report[categoryKey]) ? report[categoryKey] as any[] : [report[categoryKey]]) : [defaultCategory];
                
                categories.forEach(cat => {
                    let categoryName = cat;
                    if (allCategories.length > 0) {
                        if (typeof allCategories[0] === 'object' && 'label' in allCategories[0]) {
                            categoryName = (allCategories as { id: string, label: string }[]).find(c => c.id === cat)?.label || cat;
                        } else if (typeof allCategories[0] === 'object' && 'name' in allCategories[0]) {
                            categoryName = (allCategories as { id?: string, name: string }[]).find(c => c.name === cat)?.name || cat;
                        }
                    }

                    if (!provinceData[province][categoryName]) {
                        provinceData[province][categoryName] = 0;
                    }
                    provinceData[province][categoryName]++;
                });
            });

            return Object.entries(provinceData).map(([province, counts]) => ({
                name: province,
                ...counts
            }));
        };

        const allKeywords = [...new Set(reports.flatMap(r => r.keywords || []))];
        const keywordsByProvince = createBreakdownByProvince('keywords', allKeywords, 'No Keywords');
        const issueTypesForBreakdown = subViolationTypes.map(it => ({ id: it.id, label: getSubViolationTypeLabel(it.id) }));
        const placeTypesForBreakdown = placeTypes.map(pt => ({ name: pt.name }));
        const violationTermsForBreakdown = violationTerms.map(rg => ({ name: rg.name }));
        
        // Duplicate Place IDs
        const placeIdCounts = reports.reduce((acc, report) => {
            if (report.placeId) {
                if (!acc[report.placeId]) {
                    acc[report.placeId] = [];
                }
                acc[report.placeId].push({
                    reportNumber: report.reportNumber,
                    id: report.id
                });
            }
            return acc;
        }, {} as Record<string, { reportNumber: number; id: string }[]>);

        const duplicatePlaceIds = Object.entries(placeIdCounts)
            .filter(([, reports]) => reports.length > 1)
            .map(([placeId, reports]) => ({
                placeId,
                reports,
                count: reports.length,
            }));


        // --- Combined ---
        const totalResolutionDays = resolvedReports.reduce((acc, report) => {
            const resolvedDate = toDate(report.resolvedAt)!;
            const createdDate = toDate(report.createdAt)!;
            if (resolvedDate && createdDate) {
                return acc + differenceInDays(resolvedDate, createdDate)
            }
            return acc;
        }, 0);
        const avgResolutionTime = resolvedReports.length > 0 ? (totalResolutionDays / resolvedReports.length).toFixed(1) : '0';
        const approvalRate = reports.length > 0 ? ((reports.filter(r => r.status === 'approved').length / reports.length) * 100).toFixed(1) : '0';

        const calculateAvgResolution = (groupingKey: 'priority' | 'province') => {
            const grouped: Record<string, { totalDays: number; count: number }> = {};
            resolvedReports.forEach(report => {
                const key = (report[groupingKey] as string) || 'Unknown';
                if (!grouped[key]) grouped[key] = { totalDays: 0, count: 0 };
                const resolvedDate = toDate(report.resolvedAt)!;
                const createdDate = toDate(report.createdAt)!;
                if (resolvedDate && createdDate) {
                    grouped[key].totalDays += differenceInDays(resolvedDate, createdDate);
                    grouped[key].count++;
                }
            });

            return Object.entries(grouped).map(([name, data]) => ({
                name: t(`${groupingKey}s.${name.replace(/\s+/g, '_')}`, { defaultValue: name }),
                'Avg Days': parseFloat((data.totalDays / data.count).toFixed(1)),
            }));
        };

        const chartDataBySubViolationType = subViolationTypes.map(it => ({ 
            name: getSubViolationTypeLabel(it.id), 
            value: reports.filter(r => Array.isArray(r.subViolationType) ? r.subViolationType.includes(it.id) : r.subViolationType === it.id).length 
        }));

        return { 
            totalReports: reports.length,
            chartDataByMonth, 
            chartDataByStatus: createDistributionData('status', 'not-submitted', 'statuses'), 
            chartDataByPriority: createDistributionData('priority', 'low', 'priorities'),
            reportsByProvince,
            chartDataByViolationTerm: createDistributionData('violationTerm', 'Unassigned'),
            chartDataByImpactCategory: createDistributionData('impactCategory', 'Other'),
            chartDataBySubViolationType: chartDataBySubViolationType,
            avgResolutionTime, 
            approvalRate,
            resolutionByPriority: calculateAvgResolution('priority'),
            resolutionByProvince: calculateAvgResolution('province'),
            approvalRateByProvince,
            activityByDay: Object.entries(activityByDay).map(([date, count]) => ({ date, count })),
            teamStats,
            verificationChartData,
            subViolationTypeTrends: Object.values(subViolationTypeTrends).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()),
            placeTypeTrends: Object.values(placeTypeTrends).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()),
            groupTrends: Object.values(groupTrends).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()),
            heatmapStartDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
            subViolationTypesByProvince: createBreakdownByProvince('subViolationType', issueTypesForBreakdown, 'General'),
            placeTypesByProvince: createBreakdownByProvince('impactCategory', placeTypesForBreakdown, 'Other'),
            violationTermsByProvince: createBreakdownByProvince('violationTerm', violationTermsForBreakdown, 'Unassigned'),
            allKeywords,
            keywordsByProvince,
            duplicatePlaceIds,
        };

    }, [reports, t, subViolationTypes, placeTypes, violationTerms, history, teams]);
    
     const openDetailDialog = (title: string, data: Report[]) => {
        setDialogTitle(title);
        setDialogReports(data);
        setDialogOpen(true);
    };
    
    const handleOpenComparisonDialog = (reportIds: string[]) => {
        const toCompare = reports.filter(r => reportIds.includes(r.id));
        if (toCompare.length < 2) {
            toast({
                variant: 'destructive',
                title: 'Not enough reports to compare',
                description: 'Something went wrong. Please refresh and try again.',
            });
            return;
        }
        setReportsToCompare(toCompare);
        setIsComparisonOpen(true);
    }

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh_-_theme(spacing.14))] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <APIProvider apiKey={apiKey!}>
            <div className="container mx-auto py-10 px-4">
                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
                        <p className="text-muted-foreground">
                            An overview of all report activities and trends.
                        </p>
                    </div>

                     <Tabs defaultValue="overview">
                        <TabsList className="grid w-full grid-cols-2">
                           <TabsTrigger value="overview">Overview</TabsTrigger>
                           <TabsTrigger value="advanced">Advanced Analytics</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="mt-6 space-y-6">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                                        <LineChartIcon className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData?.totalReports}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData?.avgResolutionTime} days</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData?.approvalRate}%</div>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Resolved Reports</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                         <div className="text-2xl font-bold">{reports.filter(r => r.status === 'approved' || r.status === 'rejected').length}</div>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle>Reports Over Time</CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <ChartContainer config={{}} className="h-60 w-full">
                                        <AreaChart data={analyticsData?.chartDataByMonth}>
                                            <CartesianGrid vertical={false} />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                            <Area dataKey="reports" type="monotone" fill="hsl(var(--primary))" fillOpacity={0.4} stroke="hsl(var(--primary))" />
                                        </AreaChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <Tabs defaultValue="status">
                                    <CardHeader>
                                       <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                            <TabsTrigger value="status"><Waypoints className="mr-2 h-4 w-4" />By Status</TabsTrigger>
                                            <TabsTrigger value="priority"><AlertCircle className="mr-2 h-4 w-4" />By Priority</TabsTrigger>
                                            <TabsTrigger value="province"><MapPin className="mr-2 h-4 w-4" />By Province</TabsTrigger>
                                            <TabsTrigger value="group"><Group className="mr-2 h-4 w-4" />By Violation Term</TabsTrigger>
                                            <TabsTrigger value="impactCategory"><Building2 className="mr-2 h-4 w-4" />By Place Type</TabsTrigger>
                                        </TabsList>
                                    </CardHeader>
                                    <CardContent>
                                         <TabsContent value="status">
                                             <ChartContainer config={{}} className="h-60 w-full">
                                                <RechartsBarChart data={analyticsData?.chartDataByStatus} layout="vertical">
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={100} fontSize={12}/>
                                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} barSize={15}>
                                                        {analyticsData?.chartDataByStatus.map((entry, index) => <Cell key={`status-cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Bar>
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </TabsContent>
                                         <TabsContent value="priority">
                                             <ChartContainer config={{}} className="h-60 w-full">
                                                <RechartsBarChart data={analyticsData?.chartDataByPriority} layout="vertical">
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={100} fontSize={12}/>
                                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} barSize={15}>
                                                        {analyticsData?.chartDataByPriority.map((entry, index) => <Cell key={`priority-cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Bar>
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </TabsContent>
                                         <TabsContent value="province">
                                            {analyticsData?.reportsByProvince && (
                                                <AnalyticsMap 
                                                    reportsByProvince={analyticsData.reportsByProvince} 
                                                    onProvinceClick={openDetailDialog}
                                                />
                                            )}
                                        </TabsContent>
                                          <TabsContent value="group">
                                            <ChartContainer config={{}} className="h-60 w-full">
                                                <RechartsBarChart data={analyticsData?.chartDataByViolationTerm} layout="vertical">
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={100} fontSize={12}/>
                                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} barSize={15}>
                                                        {analyticsData?.chartDataByViolationTerm.map((entry, index) => <Cell key={`group-cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Bar>
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </TabsContent>
                                         <TabsContent value="impactCategory">
                                            <ChartContainer config={{}} className="h-60 w-full">
                                                <RechartsBarChart data={analyticsData?.chartDataByImpactCategory} layout="vertical">
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={100} fontSize={12}/>
                                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} barSize={15}>
                                                        {analyticsData?.chartDataByImpactCategory.map((entry, index) => <Cell key={`impact-cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Bar>
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </TabsContent>
                                    </CardContent>
                                </Tabs>
                            </Card>
                        </TabsContent>
                         <TabsContent value="advanced" className="mt-6 space-y-6">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Sub-Violation Type Trends</CardTitle>
                                    <CardDescription>Volume of different sub-violation types reported each month.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-96 w-full">
                                        <AreaChart data={analyticsData?.subViolationTypeTrends}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                                            <YAxis tick={{fontSize: 12}} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {analyticsData?.chartDataBySubViolationType.map((it, index) => (
                                                <Area key={`${it.name}-${index}`} type="monotone" dataKey={it.name} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} />
                                            ))}
                                        </AreaChart>
                                    </ChartContainer>
                                </CardContent>
                             </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Place Type Trends</CardTitle>
                                    <CardDescription>Volume of different place types reported each month.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-96 w-full">
                                        <AreaChart data={analyticsData?.placeTypeTrends}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                                            <YAxis tick={{fontSize: 12}} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {analyticsData?.chartDataByImpactCategory.map((it, index) => (
                                                <Area key={`${it.name}-${index}`} type="monotone" dataKey={it.name} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} />
                                            ))}
                                        </AreaChart>
                                    </ChartContainer>
                                </CardContent>
                             </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Violation Term Trends</CardTitle>
                                    <CardDescription>Volume of different violation terms created each month.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-96 w-full">
                                        <AreaChart data={analyticsData?.groupTrends}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                                            <YAxis tick={{fontSize: 12}} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {analyticsData?.chartDataByViolationTerm.map((it, index) => (
                                                <Area key={`${it.name}-${index}`} type="monotone" dataKey={it.name} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} />
                                            ))}
                                        </AreaChart>
                                    </ChartContainer>
                                </CardContent>
                             </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Time to Resolution</CardTitle>
                                    <CardDescription>Average time (in days) to resolve a report.</CardDescription>
                                </CardHeader>
                                 <CardContent>
                                    <Tabs defaultValue="resolution-priority">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="resolution-priority">By Priority</TabsTrigger>
                                            <TabsTrigger value="resolution-province">By Province</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="resolution-priority" className="mt-4">
                                            <ChartContainer config={{}} className="h-60 w-full">
                                                <RechartsBarChart data={analyticsData?.resolutionByPriority}>
                                                    <CartesianGrid vertical={false} />
                                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                                    <YAxis label={{ value: 'Avg. Days', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }} />
                                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                                    <Bar dataKey="Avg Days" fill="hsl(var(--primary))" radius={4} />
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </TabsContent>
                                        <TabsContent value="resolution-province" className="mt-4">
                                            <ChartContainer config={{}} className="h-96 w-full">
                                                <RechartsBarChart data={analyticsData?.resolutionByProvince} layout="vertical">
                                                     <CartesianGrid horizontal={false} />
                                                    <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={100} />
                                                    <XAxis type="number" label={{ value: 'Avg. Days', position: 'insideBottom', offset: -5, fill: 'hsl(var(--foreground))' }} />
                                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                                    <Bar dataKey="Avg Days" fill="hsl(var(--primary))" radius={4} />
                                                </RechartsBarChart>
                                            </ChartContainer>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>User Activity Heatmap</CardTitle>
                                    <CardDescription>Total user actions (reports, comments, edits) per day.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <ReactCalendarHeatmap
                                            startDate={analyticsData?.heatmapStartDate}
                                            endDate={new Date()}
                                            values={analyticsData?.activityByDay || []}
                                            classForValue={(value) => {
                                                if (!value) return 'color-empty';
                                                return `color-scale-${Math.min(4, Math.ceil(value.count / 5))}`;
                                            }}
                                            transformDayElement={(element, value, index) =>
                                                React.cloneElement(element, {
                                                    'data-tooltip-id': 'heatmap-tooltip',
                                                    'data-tooltip-content': `${value ? value.date : ''}: ${value ? value.count : 0} activities`,
                                                } as any)
                                            }
                                        />
                                    </div>
                                    <ReactTooltip id="heatmap-tooltip" />
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Approval Rate by Province</CardTitle>
                                    <CardDescription>Percentage of reports approved vs. rejected in each province.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-96 w-full">
                                        <RechartsBarChart data={analyticsData?.approvalRateByProvince} layout="vertical" stackOffset="expand">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                                            <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="Approved" stackId="a" fill="#22c55e" />
                                            <Bar dataKey="Rejected" stackId="a" fill="#ef4444" />
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                             </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Sub-Violation Types by Province</CardTitle>
                                    <CardDescription>Breakdown of sub-violation types submitted in each province.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-[500px] w-full">
                                        <RechartsBarChart data={analyticsData?.subViolationTypesByProvince} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {analyticsData?.chartDataBySubViolationType.map((it, index) => (
                                                <Bar key={`${it.name}-${index}`} dataKey={it.name} stackId="a" fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                             </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Place Types by Province</CardTitle>
                                    <CardDescription>Breakdown of place types reported in each province.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-[500px] w-full">
                                        <RechartsBarChart data={analyticsData?.placeTypesByProvince} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {analyticsData?.chartDataByImpactCategory.map((it, index) => (
                                                <Bar key={`${it.name}-${index}`} dataKey={it.name} stackId="a" fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Violation Terms by Province</CardTitle>
                                    <CardDescription>Breakdown of violation terms in each province.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-[500px] w-full">
                                        <RechartsBarChart data={analyticsData?.violationTermsByProvince} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {analyticsData?.chartDataByViolationTerm.map((it, index) => (
                                                <Bar key={`${it.name}-${index}`} dataKey={it.name} stackId="a" fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Keywords by Province</CardTitle>
                                    <CardDescription>Breakdown of keywords submitted in each province.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {analyticsData && analyticsData.allKeywords.length > 0 ? (
                                        <ChartContainer config={{}} className="h-[500px] w-full">
                                            <RechartsBarChart data={analyticsData?.keywordsByProvince} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                                                <Tooltip content={<CustomTooltip />} />
                                                {analyticsData?.allKeywords.map((kw, index) => (
                                                    <Bar key={`${kw}-${index}`} dataKey={kw} stackId="a" fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </RechartsBarChart>
                                        </ChartContainer>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">No keyword data to display.</div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Team Performance</CardTitle>
                                    <CardDescription>Overview of report resolution by team.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <ChartContainer config={{}} className="h-80 w-full">
                                        <ComposedChart data={analyticsData?.teamStats}>
                                            <CartesianGrid vertical={false} />
                                            <XAxis dataKey="name" />
                                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Reports', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Avg. Days', angle: -90, position: 'insideRight', fill: 'hsl(var(--foreground))' }}/>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar yAxisId="left" dataKey="resolved" name="Resolved Reports" fill="#8884d8" />
                                            <Bar yAxisId="left" dataKey="unresolved" name="Unresolved Reports" fill="#ffc658" />
                                            <Line yAxisId="right" type="monotone" dataKey="avgTime" name="Avg. Resolution Time (Days)" stroke="#82ca9d" />
                                        </ComposedChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Community Verification Analysis</CardTitle>
                                    <CardDescription>Does community verification impact report approval?</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="h-80 w-full">
                                        <RechartsBarChart data={analyticsData?.verificationChartData}>
                                            <CartesianGrid vertical={false} />
                                            <XAxis dataKey="name" />
                                            <YAxis yAxisId="left" dataKey="Approval Rate" label={{ value: 'Approval Rate (%)', angle: -90, position: 'insideLeft' }} tickFormatter={(value) => value.toFixed(0)} />
                                            <YAxis yAxisId="right" orientation="right" dataKey="Total Reports" label={{ value: 'Total Reports', angle: -90, position: 'insideRight' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar yAxisId="left" dataKey="Approval Rate" fill="#8884d8" />
                                            <Bar yAxisId="right" dataKey="Total Reports" fill="#82ca9d" />
                                        </RechartsBarChart>
                                    </ChartContainer>
                                </CardContent>
                             </Card>
                        </TabsContent>



                     </Tabs>
                </div>
                 <DashboardDetailDialog
                    isOpen={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    title={dialogTitle}
                    reports={dialogReports}
                />
                 <ComparisonDialog
                    isOpen={isComparisonOpen}
                    onClose={() => setIsComparisonOpen(false)}
                    reports={reportsToCompare}
                    onMergeComplete={() => {
                        toast({ title: 'Merge successful, refreshing data...' });
                        fetchInitialData();
                    }}
                />
            </div>
        </APIProvider>
    );
}

    