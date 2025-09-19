

"use client";

import { RecordsTable } from '@/components/records-table';
import { getReports, getViolationTerms, getSubViolationTypes, getAllReports } from '@/app/actions';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Report, ViolationTerm, SubViolationType } from '@/lib/types';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { SortingState, PaginationState, ColumnDef } from '@tanstack/react-table';

function RecordsTableSkeleton() {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-full max-w-sm" />
            <div className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                 <Skeleton className="h-10 w-20" />
            </div>
        </div>
        <Skeleton className="h-96 w-full" />
        <div className="flex justify-between items-center">
             <Skeleton className="h-8 w-32" />
             <Skeleton className="h-8 w-64" />
        </div>
      </div>
    );
}

const priorities: NonNullable<Report['priority']>[] = ['low', 'medium', 'high'];
const statuses: Report['status'][] = ['not-submitted', 'submitted', 'in-review', 'pending', 'approved', 'rejected', 'archived'];

export default function RecordsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    
    // Data state
    const [data, setData] = useState<Report[] | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Filter options state
    const [violationTerms, setViolationTerms] = useState<ViolationTerm[]>([]);
    const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
    const [availableProvinces, setAvailableProvinces] = useState<string[]>([]);
    
    // UI state derived from URL
    const pageIndex = Number(searchParams.get('page') ?? '1') - 1;
    const pageSize = Number(searchParams.get('limit') ?? '10');
    const sort = searchParams.get('sort') ?? 'reportNumber';
    const order = searchParams.get('order') ?? 'desc';
    const violationTerm = searchParams.get('violationTerm') ?? 'all';
    const status = searchParams.get('status') ?? 'all';
    const priority = searchParams.get('priority') ?? 'all';
    const subViolationType = searchParams.get('subViolationType') ?? 'all';
    const province = searchParams.get('province') ?? 'all';
    const searchQuery = searchParams.get('search') ?? '';
    
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [debouncedSearch] = useDebounce(localSearch, 500);

    const sorting = useMemo<SortingState>(() => ([
        { id: sort, desc: order === 'desc' },
    ]), [sort, order]);

    const pagination = useMemo<PaginationState>(() => ({
        pageIndex,
        pageSize,
    }), [pageIndex, pageSize]);

    const createQueryString = useCallback((newParams: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(newParams)) {
        if (value === null || value === '' || value === 'all' || (key === 'page' && value === 1)) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      return params.toString();
    }, [searchParams]);

    // This is the main data fetching function.
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const currentSorting = { id: sort, desc: order === 'desc' };
        
        const reportsResult = await getReports({
            pageIndex: pageIndex,
            pageSize: pageSize,
            sorting: currentSorting,
            filters: { violationTerm, status, priority, subViolationType, province, search: searchQuery },
        });

        if (reportsResult.success) {
            setData(reportsResult.data || []);
            setPageCount(reportsResult.pageCount || 0);
        } else {
            setData([]);
            setPageCount(0);
        }
        setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex, pageSize, sort, order, violationTerm, status, priority, subViolationType, province, searchQuery]);
    
    // Effect to fetch data whenever a dependency changes.
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle debounced search updates
    useEffect(() => {
        if (debouncedSearch !== searchQuery) {
            const newQuery = createQueryString({ search: debouncedSearch, page: 1 }); // Go to first page on new search
            router.push(`${pathname}?${newQuery}`);
        }
    }, [debouncedSearch, createQueryString, pathname, router, searchQuery]);

    // Fetch static filter options once
    useEffect(() => {
        const fetchFilters = async () => {
            const [termsResult, issuesResult, allReportsResult] = await Promise.all([
                getViolationTerms(), 
                getSubViolationTypes(),
                getAllReports()
            ]);
            if (termsResult.success && termsResult.data) setViolationTerms(termsResult.data);
            if (issuesResult.success && issuesResult.data) setSubViolationTypes(issuesResult.data);
            if (allReportsResult.success && allReportsResult.data) {
                const provincesFromReports = allReportsResult.data
                    .map(r => r.province)
                    .filter((p): p is string => !!p && p.trim() !== ''); // Filter out null, undefined, and empty strings
                setAvailableProvinces([...new Set(provincesFromReports)].sort());
            }
        };
        fetchFilters();
    }, []);

    const handleFilterChange = (key: string, value: string) => {
        const newQuery = createQueryString({ [key]: value, page: 1 });
        router.push(`${pathname}?${newQuery}`);
    };
    
    const handleSortingChange = (updater: any) => {
        const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
        const sortField = newSorting[0];
        const newParams: Record<string, string | number | null> = { page: 1 };
        if (sortField) {
            newParams.sort = sortField.id;
            newParams.order = sortField.desc ? 'desc' : 'asc';
        } else {
            newParams.sort = null;
            newParams.order = null;
        }
        router.push(`${pathname}?${createQueryString(newParams)}`);
    };
    
     const handlePaginationChange = (updater: any) => {
        const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
        const newParams = {
            page: newPagination.pageIndex + 1,
            limit: newPagination.pageSize,
        };
        router.push(`${pathname}?${createQueryString(newParams)}`);
    };

    const clearFilters = () => {
        setLocalSearch('');
        router.push(pathname);
    };
    
    const activeFiltersCount = useMemo(() => {
        return [violationTerm, status, priority, subViolationType, province, searchQuery].filter(f => f && f !== 'all' && f !== '').length;
    }, [violationTerm, status, priority, subViolationType, province, searchQuery]);

    if (isLoading || data === null) {
        return <RecordsTableSkeleton />;
    }

    return (
        <>
            <div className="space-y-2 mb-4">
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by ID, Place ID, English Name..."
                        className="pl-8 sm:w-full"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={violationTerm} onValueChange={(value) => handleFilterChange('violationTerm', value)}>
                        <SelectTrigger className="w-full sm:w-auto">
                            <SelectValue placeholder={t('violation_terms.title')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('records.all_violation_terms')}</SelectItem>
                            {violationTerms.filter(g => g.name && g.name.trim() !== '').map(g => (
                                <SelectItem key={g.id} value={g.name}>{t(`violation_terms.${g.name.replace(/\s+/g, '_').toLowerCase()}`, { defaultValue: g.name })}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-auto">
                            <SelectValue placeholder={t('records.table_header.status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('records.all_statuses')}</SelectItem>
                            {statuses.map(s => (
                                <SelectItem key={s} value={s}>{t(`statuses.${s}`)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                        <SelectTrigger className="w-full sm:w-auto">
                            <SelectValue placeholder={t('records.table_header.priority')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('records.all_priorities')}</SelectItem>
                            {priorities.map(p => (
                                <SelectItem key={p} value={p}>{t(`priorities.${p}`)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={subViolationType} onValueChange={(value) => handleFilterChange('subViolationType', value)}>
                        <SelectTrigger className="w-full sm:w-auto">
                            <SelectValue placeholder={t('records.table_header.sub_violation_type')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('records.all_sub_violation_types')}</SelectItem>
                            {subViolationTypes.filter(Boolean).map(it => (
                                <SelectItem key={it.id} value={it.id}>{t(`sub_violation_types.${it.id}`, { defaultValue: it.label })}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={province} onValueChange={(value) => handleFilterChange('province', value)}>
                        <SelectTrigger className="w-full sm:w-auto">
                            <SelectValue placeholder={t('records.table_header.province')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Provinces</SelectItem>
                            {availableProvinces.map(p => (
                                <SelectItem key={p} value={p}>{t(`provinces.${p.replace(/\s+/g, '_')}`, { defaultValue: p })}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {activeFiltersCount > 0 && (
                        <Button variant="ghost" onClick={clearFilters}>
                            <X className="mr-2 h-4 w-4" />
                            {t('records.clear_filters')}
                        </Button>
                    )}
                </div>
            </div>
            <RecordsTable 
                data={data}
                columns={[]} // Columns are defined within RecordsTable
                pageCount={pageCount}
                pagination={pagination}
                onPaginationChange={handlePaginationChange}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                refetchData={fetchData}
            />
        </>
    );
}
