
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getReportByNumericId, getSubViolationTypes, getDriveFolderInfo } from '@/app/actions';
import { Report, SubViolationType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, MapPin, ExternalLink, Eye, FileText, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { EvidenceDialog } from '@/components/evidence-dialog';

const toTitleCase = (str: string) => {
  return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const DetailItem = ({ label, value }: { label: string, value: any }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-base">{String(value)}</p>
        </div>
    );
};

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const [report, setReport] = useState<Report | null>(null);
    const [subViolationTypes, setSubViolationTypes] = useState<SubViolationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);
    const [evidenceInfo, setEvidenceInfo] = useState<{ fileCount: number; fileTypes: string[]; error?: string } | null>(null);

    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            const reportNumber = id ? parseInt(id, 10) : NaN;

            if (!id || isNaN(reportNumber)) {
                setError("Report ID is missing or invalid.");
                setLoading(false);
                return;
            };

            const [reportResult, subViolationTypesResult] = await Promise.all([
                getReportByNumericId(reportNumber),
                getSubViolationTypes()
            ]);

            if (reportResult.success && reportResult.data) {
                setReport(reportResult.data);
                
                // Fetch evidence info if drive link exists
                if (reportResult.data.driveLink) {
                    try {
                        const evidenceResult = await getDriveFolderInfo(reportResult.data.driveLink);
                        setEvidenceInfo(evidenceResult);
                    } catch (error) {
                        console.error('Failed to fetch evidence info:', error);
                        setEvidenceInfo({ fileCount: 0, fileTypes: [], error: 'Failed to load evidence info' });
                    }
                }
            } else {
                setError(reportResult.error || "Failed to load report details.");
            }

            if (subViolationTypesResult.success && subViolationTypesResult.data) {
                setSubViolationTypes(subViolationTypesResult.data);
            }

            setLoading(false);
        };

        fetchReportData();
    }, [id]);

    const getSubViolationTypeLabel = (report: Report) => {
        const subViolationTypeIds = Array.isArray(report.subViolationType) ? report.subViolationType : [report.subViolationType];
        if (!subViolationTypeIds || subViolationTypeIds.length === 0) return t('records.na', 'N/A');
    
        return subViolationTypeIds
            .map(etId => {
                if (etId === 'other') return `${t('sub_violation_types.other')}: ${report.otherSubViolationType || t('records.specified')}`;
                
                const foundType = subViolationTypes.find(it => it.id === etId);
                const label = foundType?.label || toTitleCase(etId); // Fallback to formatted ID
                
                const translationKey = `sub_violation_types.${etId}`;
                const translated = t(translationKey, { defaultValue: label });
                return translated;
            })
            .join(', ');
    };
    
    const isLikelyUid = (name: string) => {
        // A simple check: UIDs are often 20+ chars, alphanumeric, with no spaces.
        // Also check if it's the fallback name we're trying to avoid.
        return name && (name.length > 20 && !name.includes(' ')) || name === 'Community User';
    }
    
    const reporterName = report?.reportedByName && !isLikelyUid(report.reportedByName)
        ? report.reportedByName
        : 'Community User';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh_-_theme(spacing.14))]">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-10 px-4 text-center">
                <p className="text-destructive">{error}</p>
                 <Button onClick={() => router.push('/records')} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Records
                </Button>
            </div>
        );
    }
    
    if (!report) {
         return (
            <div className="container mx-auto py-10 px-4 text-center">
                <p>Report not found.</p>
                <Button onClick={() => router.push('/records')} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Records
                </Button>
            </div>
        );
    }
    
    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        const dateObj = typeof date === 'string' ? new Date(date) : (date as Timestamp).toDate();
        return format(dateObj, 'PPP p');
    }

    return (
        <div className="container mx-auto py-10 px-4">
             <Button onClick={() => router.push('/records')} variant="outline" className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Records
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Report #{report.reportNumber}</CardTitle>
                            <CardDescription>{report.description}</CardDescription>
                        </div>
                         {report.violationTerm && <Badge variant="secondary">{report.violationTerm}</Badge>}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <DetailItem label="Status" value={t(`statuses.${report.status}`)} />
                        <DetailItem label="Priority" value={t(`priorities.${report.priority || 'low'}`)} />
                        <DetailItem label="Sub-Violation Type" value={getSubViolationTypeLabel(report)} />
                        {report.otherSubViolationType && <DetailItem label="Other Issue Details" value={report.otherSubViolationType} />}
                        <DetailItem label="Place ID" value={report.placeId} />
                        <DetailItem label="English Name" value={report.englishLanguage} />
                        <DetailItem label="Khmer Name" value={report.nativeKhmerLanguage} />
                        <DetailItem label="Thai Name" value={report.thaiLanguage} />
                        {report.position && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Location</p>
                                <Button asChild variant="link" className="p-0 h-auto">
                                    <a href={`https://www.google.com/maps?q=${report.position.lat},${report.position.lng}`} target="_blank" rel="noopener noreferrer">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        View on Map
                                    </a>
                                </Button>
                            </div>
                        )}
                        <DetailItem label="Reported By" value={reporterName} />
                        <DetailItem label="Date Reported" value={formatDate(report.createdAt)} />
                        <DetailItem label="Target Date" value={report.targetDate ? formatDate(report.targetDate) : 'N/A'} />
                        <DetailItem label="Progress" value={`${report.progress || 0}%`} />
                         <div className="md:col-span-2">
                             {report.driveLink && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Evidence Folder</p>
                                    {evidenceInfo && (
                                        <div className="mb-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                <span>{evidenceInfo.fileCount} files</span>
                                                {evidenceInfo.fileTypes.length > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Types: {evidenceInfo.fileTypes.join(', ')}</span>
                                                    </>
                                                )}
                                            </div>
                                            {evidenceInfo.error && (
                                                <p className="text-red-500 text-xs mt-1">{evidenceInfo.error}</p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setIsEvidenceDialogOpen(true)}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Evidence
                                        </Button>
                                        <Button asChild variant="link" size="sm">
                                            <a href={report.driveLink} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open in Drive
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-2">
                             <DetailItem label="Notes" value={report.notes} />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Evidence Dialog */}
            {report?.driveLink && (
                <EvidenceDialog
                    isOpen={isEvidenceDialogOpen}
                    onClose={() => setIsEvidenceDialogOpen(false)}
                    driveLink={report.driveLink}
                    reportNumber={report.reportNumber}
                />
            )}
        </div>
    );
}
