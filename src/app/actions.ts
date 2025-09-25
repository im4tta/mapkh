

'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, getDoc, limit, startAfter, writeBatch, runTransaction, DocumentReference, arrayUnion, setDoc, FieldValue, arrayRemove } from 'firebase/firestore';
import { type Report, UserInfo, type Notification, NOTIFICATION_TYPES, LeaderboardEntry, CommunityPost, Tip, TipIcon, BadgeId, badges, SubViolationType, PlaceType, Team, HistoryLog, ViolationTerm, iconMap, Province } from '@/lib/types';
import { reverseGeocode } from '@/ai/flows/get-province-from-latlng';
import { createDriveFolder } from '@/ai/flows/create-drive-folder';
import { uploadFileToDrive } from '@/ai/flows/upload-to-drive';
import { saveUrlToDrive } from '@/ai/flows/upload-url-to-drive';
import { geocodeAddress } from '@/ai/flows/geocode-address';
import { moveDriveFiles } from '@/ai/flows/move-drive-files';
import { Client as MapsClient, PlaceData, AddressType, Language, GeocodeResult, GeocodingAddressComponentType } from '@googlemaps/google-maps-services-js';
import { google } from 'googleapis';

export async function getDriveFolderInfo(driveLink: string): Promise<{ fileCount: number; fileTypes: string[]; error?: string }> {
    try {
        // Extract folder ID from Google Drive link
        const match = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return { fileCount: 0, fileTypes: [], error: 'Invalid Google Drive folder link' };
        }
        
        const folderId = match[1];
        
        const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
        const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (!serviceAccountEmail || !serviceAccountKey) {
            return { fileCount: 0, fileTypes: [], error: 'Google Drive integration not configured' };
        }
        
        const auth = new google.auth.JWT(
            serviceAccountEmail,
            undefined,
            serviceAccountKey,
            ['https://www.googleapis.com/auth/drive.readonly']
        );
        
        const drive = google.drive({ version: 'v3', auth });
        
        // List files in the folder
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        
        const files = res.data.files || [];
        const fileCount = files.length;
        
        // Get unique file types
        const fileTypes = [...new Set(files.map(file => {
            const mimeType = file.mimeType || '';
            if (mimeType.startsWith('image/')) return 'Image';
            if (mimeType.startsWith('video/')) return 'Video';
            if (mimeType.startsWith('audio/')) return 'Audio';
            if (mimeType.includes('pdf')) return 'PDF';
            if (mimeType.includes('document') || mimeType.includes('text')) return 'Document';
            if (mimeType.includes('spreadsheet')) return 'Spreadsheet';
            if (mimeType.includes('presentation')) return 'Presentation';
            if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
            return 'Other';
        }).filter(type => type !== 'Folder'))]; // Exclude folders from file types
        
        return { fileCount, fileTypes };
    } catch (error: any) {
        console.error('Error getting Drive folder info:', error);
        return { fileCount: 0, fileTypes: [], error: error.message || 'Failed to get folder information' };
    }
}

const reportSchema = z.object({
  reportNumber: z.number().optional(),
  subViolationType: z.array(z.string()).min(1, 'Please select at least one error type.'),
  otherSubViolationType: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  province: z.string().min(1, 'Province is required.'),
  placeId: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  englishLanguage: z.string().optional(),
  nativeKhmerLanguage: z.string().optional(),
  thaiLanguage: z.string().optional(),
  driveLink: z.string().url().optional().or(z.literal('')),
  locationWithin: z.string().optional(),
  impactCategory: z.string().optional(),
  violationTerm: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  reportedBy: z.string().optional(), // Should be UID
  reportedByName: z.string().optional(), // Should be display name
  submittedBy: z.string().optional(),
  targetDate: z.date().optional(),
  progress: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['not-submitted', 'submitted', 'in-review', 'pending', 'approved', 'rejected', 'archived']).optional(),
  keywords: z.array(z.string()).optional(),
});


async function getCurrentUser(uid: string, name?: string | null, email?: string | null): Promise<UserInfo> {
    if (!uid) {
        return {
            uid: 'anonymous',
            name: 'Anonymous User',
            avatar: null,
            email: 'anonymous@example.com',
        };
    }

    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
            uid: uid,
            name: userData.displayName || name || null,
            avatar: userData.photoURL || null, 
            email: userData.email || email || null,
        };
    }
    
    // If name is provided from auth, use it
    if (name) {
        return {
            uid: uid,
            name: name,
            avatar: null, // photoURL would also be available on user object
            email: email || null,
        }
    }


    return {
        uid: uid,
        name: `Community User`, 
        avatar: null,
        email: email || null,
    };
}

export async function createNotification(userId: string | null, type: Notification['type'], title: string, message: string, reportId: string, reportDetails?: { description: string; position: { lat: number; lng: number }; reportNumber: number; }) {
    if (!NOTIFICATION_TYPES[type]) return;

    try {
        await addDoc(collection(db, 'notifications'), {
            userId: userId, 
            type,
            title,
            message,
            reportId,
            // The `data` property is for background push notifications
            data: {
              title: title,
              body: message,
              icon: '/apple-icon.png',
              badge: '/icon.png',
            },
            reportDetails: reportDetails ? JSON.stringify(reportDetails) : "{}",
            read: false,
            createdAt: serverTimestamp(),
            dismissedBy: [], // New field to track dismissals
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
}

export async function submitReport(data: z.infer<typeof reportSchema>, userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
  const parsed = reportSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  
  if (parsed.data.subViolationType.includes('other') && !parsed.data.otherSubViolationType) {
      return {
        success: false,
        errors: { otherSubViolationType: ['Please specify the issue type.'] },
      };
  }

  if (!userId) {
    return { success: false, error: "You must be logged in to submit a report." };
  }
  
  const currentUser = await getCurrentUser(userId, userName, userEmail);

  const { lat, lng, ...reportData } = parsed.data;

    // Handle new place types
    if (reportData.impactCategory) {
        await addPlaceType(reportData.impactCategory);
    }


  try {
    const reportRef = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', 'reports');
        const counterDoc = await transaction.get(counterRef);

        let newReportNumber = 1;
        if (counterDoc.exists()) {
            newReportNumber = counterDoc.data().currentNumber + 1;
        }
        
        transaction.set(counterRef, { currentNumber: newReportNumber }, { merge: true });

        const newReportRef = doc(collection(db, 'reports'));
        transaction.set(newReportRef, {
            ...reportData,
            violationTerm: (reportData.violationTerm && reportData.violationTerm !== 'None') ? reportData.violationTerm : null,
            reportNumber: newReportNumber,
            position: {
                lat: lat,
                lng: lng,
            },
            status: 'not-submitted',
            createdAt: serverTimestamp(),
            progress: reportData.progress || 0,
            targetDate: reportData.targetDate ? Timestamp.fromDate(reportData.targetDate) : null,
            reportedBy: userId,
            reportedByName: currentUser.name, 
            submittedBy: '', // Clear submittedBy on new report
            verifications: [], // Initialize community verification
            commentCount: 0,
            priority: 'low', // Default priority for new reports
            keywords: [],
        });
        
        return { id: newReportRef.id, reportNumber: newReportNumber };
    });

    // Create Drive folder automatically
    const driveResult = await createDriveFolder({ reportId: reportRef.id, reportNumber: reportRef.reportNumber });
    if (driveResult.error) {
        // Even if folder creation fails, the report is still submitted.
        // We can add more robust error handling here later, like a retry mechanism.
        console.error(`Failed to create Drive folder for Report #${reportRef.reportNumber}: ${driveResult.error}`);
    }


    const allIssueTypes = (await getSubViolationTypes()).data || [];
    let errorTypeLabel = '';
    const errorTypeIds = Array.isArray(reportData.subViolationType) ? reportData.subViolationType : [reportData.subViolationType];
    
    errorTypeLabel = errorTypeIds.map(etId => {
        if (etId === 'other') return `Other: ${reportData.otherSubViolationType}`;
        const errorType = allIssueTypes.find(e => e.id === etId);
        return errorType ? errorType.label : etId;
    }).join(', ');


    await addDoc(collection(db, 'history'), {
      action: 'report_submitted',
      details: `Report #${reportRef.reportNumber} (${errorTypeLabel}): "${reportData.description}"`,
      user: currentUser,
      createdAt: serverTimestamp(),
      reportId: reportRef.id,
      entityId: reportRef.id,
      entityType: 'report',
    });
    
    // Global notification to community
    await createNotification(
        null, // null userId for global broadcast
        'new_report', 
        `New Community Report #${reportRef.reportNumber}`, 
        `By ${currentUser.name}: "${reportData.description.substring(0, 50)}..."`, 
        reportRef.id,
        { description: reportData.description, position: { lat, lng }, reportNumber: reportRef.reportNumber }
    );


    return {
      success: true,
      data: { id: reportRef.id, reportNumber: reportRef.reportNumber },
    };
  } catch (error) {
    console.error('Error submitting report:', error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return {
      success: false,
      errors: { _server: ['An unexpected error occurred. Please try again.'] },
    };
  }
}

const updateSchema = reportSchema.partial().extend({
    subViolationType: z.array(z.string()).min(1, "Please select at least one error type.").optional(),
    violationTerm: z.string().optional(),
    keywords: z.array(z.string()).optional(),
});

function getErrorTypeString(subViolationType?: string | string[]): string {
    if (!subViolationType) return '';
    if (Array.isArray(subViolationType)) {
        return subViolationType.join(', ');
    }
    return subViolationType;
}


export async function updateReport(id: string, data: z.infer<typeof updateSchema>, userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to update a report." };
    }

    const parsed = updateSchema.safeParse(data);

    if (!parsed.success) {
        return {
            success: false,
            errors: parsed.error.flatten().fieldErrors,
        };
    }
    
    if (parsed.data.subViolationType?.includes('other') && !parsed.data.otherSubViolationType) {
        return {
            success: false,
            errors: { otherSubViolationType: ['Please specify the issue type.'] },
        };
    }

    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const { lat, lng, ...reportData } = parsed.data;
    const reportRef = doc(db, 'reports', id);

    try {
        const docSnap = await getDoc(reportRef);
        if (!docSnap.exists()) {
            return { success: false, error: 'Report not found' };
        }
        const oldReportData = docSnap.data() as Report;

        const updatePayload: { [key: string]: any } = { ...reportData };

        if (lat !== undefined && lng !== undefined) {
            updatePayload.position = { lat, lng };
        }

        if (data.targetDate) {
            updatePayload.targetDate = Timestamp.fromDate(data.targetDate);
        } else if (data.hasOwnProperty('targetDate')) {
            updatePayload.targetDate = null;
        }
        
        if (data.impactCategory) {
            await addPlaceType(data.impactCategory);
        }


        if (reportData.progress !== undefined && reportData.progress !== null) {
            updatePayload.progress = reportData.progress;
        }

        if (data.hasOwnProperty('violationTerm')) {
            updatePayload.violationTerm = (data.violationTerm && data.violationTerm !== 'None') ? data.violationTerm : null;
        }

        // Add resolvedAt timestamp if status is changing to approved or rejected
        if (reportData.status && (reportData.status === 'approved' || reportData.status === 'rejected') && oldReportData.status !== reportData.status) {
            updatePayload.resolvedAt = serverTimestamp();
        }

        updatePayload.submittedBy = currentUser.name;
        updatePayload.reportedBy = oldReportData.reportedBy;
        updatePayload.reportedByName = oldReportData.reportedByName;
        updatePayload.reportNumber = oldReportData.reportNumber;
        
        Object.keys(updatePayload).forEach(keyStr => {
            const key = keyStr as keyof typeof updatePayload;
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });

        if (Object.keys(updatePayload).length > 0) {
            await updateDoc(reportRef, updatePayload);
        }

        const changes = Object.keys(reportData)
            .map(key => {
                const oldValue = oldReportData[key as keyof Report];
                const newValue = reportData[key as keyof typeof reportData];
                
                // Firestore doesn't allow undefined values. Convert to null.
                const safeNewValue = newValue === undefined ? null : newValue;

                if (key === 'position' && lat && lng && oldReportData.position && oldReportData.position.lat === lat && oldReportData.position.lng === lng) return null;
                if (JSON.stringify(oldValue) === JSON.stringify(safeNewValue)) return null;
                if (oldValue instanceof Timestamp && safeNewValue instanceof Date && oldValue.toDate().getTime() === safeNewValue.getTime()) return null;
                if (oldValue === undefined && safeNewValue === null) return null;
                
                return { field: key, oldValue: oldValue === undefined ? null : oldValue, newValue: safeNewValue };
            })
            .filter((c): c is { field: string, oldValue: any, newValue: any } => c !== null);

        if (changes.length > 0) {
            await addDoc(collection(db, 'history'), {
                action: 'report_edited',
                details: changes,
                user: currentUser,
                createdAt: serverTimestamp(),
                reportId: id,
                entityId: id,
                entityType: 'report',
            });

            const statusChange = changes.find(c => c!.field === 'status');

            if (statusChange && oldReportData.reportedBy) {
                 await createNotification(
                    oldReportData.reportedBy,
                    'status_change',
                    `Report #${oldReportData.reportNumber} Status Updated`,
                    `The status was changed from "${statusChange.oldValue}" to "${statusChange.newValue}".`,
                    id,
                    { description: oldReportData.description, position: oldReportData.position, reportNumber: oldReportData.reportNumber }
                );
            } else {
                 await createNotification(
                    null,
                    'report_edited', 
                    `Report #${oldReportData.reportNumber} Edited`,
                    `${currentUser.name} updated details for report "${oldReportData.description.substring(0, 30)}...".`,
                    id,
                    { description: oldReportData.description, position: oldReportData.position, reportNumber: oldReportData.reportNumber }
                );
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error updating report:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return {
            success: false,
            errors: { _server: ['An unexpected error occurred. Please try again.'] },
        };
    }
}



export async function deleteReport(id: string, userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to delete a report." };
    }
    
    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const batch = writeBatch(db);

    try {
        const reportRef = doc(db, 'reports', id);
        batch.delete(reportRef);

        const notificationsQuery = query(collection(db, 'notifications'), where('reportId', '==', id));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const historyDocRef = doc(collection(db, 'history'));
        batch.set(historyDocRef, {
            action: 'report_deleted',
            details: `Report with ID ${id} was deleted.`,
            user: currentUser,
            createdAt: serverTimestamp(),
            reportId: id,
            entityId: id,
            entityType: 'report',
        });
        
        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error('Error deleting report:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}

export async function deleteReports(ids: string[], userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to delete reports." };
    }
    
    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const batch = writeBatch(db);
    const historyCollectionRef = collection(db, 'history');
    const notificationsCollectionRef = collection(db, 'notifications');

    try {
        for (const id of ids) {
            const reportRef = doc(db, 'reports', id);
            batch.delete(reportRef);

            const historyDocRef = doc(historyCollectionRef);
            batch.set(historyDocRef, {
                action: 'report_deleted',
                details: `Report with ID ${id} was deleted during a bulk operation.`,
                user: currentUser,
                createdAt: serverTimestamp(),
                reportId: id,
                entityId: id,
                entityType: 'report',
            });

            const notificationsQuery = query(notificationsCollectionRef, where('reportId', '==', id));
            const notificationsSnapshot = await getDocs(notificationsQuery);
            notificationsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
        }

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error('Error deleting reports:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}

export async function bulkUpdateReportsStatus(ids: string[], status: Report['status'], userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to update reports." };
    }
    if (!ids || ids.length === 0) {
        return { success: false, error: "No report IDs provided." };
    }
    if (!status) {
        return { success: false, error: "No status provided." };
    }

    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const batch = writeBatch(db);

    try {
        ids.forEach(id => {
            const reportRef = doc(db, 'reports', id);
            const updatePayload: { status: Report['status'], resolvedAt?: FieldValue } = { status };
            if (status === 'approved' || status === 'rejected') {
                updatePayload.resolvedAt = serverTimestamp();
            }
            batch.update(reportRef, updatePayload);
        });

        const historyDocRef = doc(collection(db, 'history'));
        batch.set(historyDocRef, {
            action: 'report_bulk_status_update',
            details: `Updated status to "${status}" for ${ids.length} reports. Report IDs: ${ids.join(', ')}`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityType: 'report',
            entityId: ids.join(', '), 
        });

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error('Error during bulk status update:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return {
            success: false,
            error: 'An unexpected error occurred during bulk update.',
        };
    }
}

export async function bulkUpdateReportsProvince(ids: string[], province: string, userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to update reports." };
    }
    if (!ids || ids.length === 0) {
        return { success: false, error: "No report IDs provided." };
    }
    if (!province) {
        return { success: false, error: "No province provided." };
    }

    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const batch = writeBatch(db);

    try {
        ids.forEach(id => {
            const reportRef = doc(db, 'reports', id);
            batch.update(reportRef, { province });
        });

        const historyDocRef = doc(collection(db, 'history'));
        batch.set(historyDocRef, {
            action: 'report_bulk_province_update',
            details: `Updated province to "${province}" for ${ids.length} reports. Report IDs: ${ids.join(', ')}`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityType: 'report',
            entityId: ids.join(', '), 
        });

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error('Error during bulk province update:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return {
            success: false,
            error: 'An unexpected error occurred during bulk update.',
        };
    }
}

export async function bulkUpdateReportsPriority(ids: string[], priority: Report['priority'], userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to update reports." };
    }
    if (!ids || ids.length === 0) {
        return { success: false, error: "No report IDs provided." };
    }
    if (!priority) {
        return { success: false, error: "No priority provided." };
    }

    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const batch = writeBatch(db);

    try {
        ids.forEach(id => {
            const reportRef = doc(db, 'reports', id);
            batch.update(reportRef, { priority });
        });

        const historyDocRef = doc(collection(db, 'history'));
        batch.set(historyDocRef, {
            action: 'report_bulk_priority_update',
            details: `Updated priority to "${priority}" for ${ids.length} reports. Report IDs: ${ids.join(', ')}`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityType: 'report',
            entityId: ids.join(', '),
        });

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error('Error during bulk priority update:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return {
            success: false,
            error: 'An unexpected error occurred during bulk update.',
        };
    }
}

export async function bulkUpdateReportsIssueType(ids: string[], issueType: string[], userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to update reports." };
    }
    if (!ids || ids.length === 0) {
        return { success: false, error: "No report IDs provided." };
    }
    if (!issueType || issueType.length === 0) {
        return { success: false, error: "No issue type provided." };
    }

    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const batch = writeBatch(db);

    try {
        ids.forEach(id => {
            const reportRef = doc(db, 'reports', id);
            batch.update(reportRef, { subViolationType: issueType });
        });

        const historyDocRef = doc(collection(db, 'history'));
        batch.set(historyDocRef, {
            action: 'report_bulk_issue_type_update',
            details: `Updated issue type to "${issueType.join(', ')}" for ${ids.length} reports. Report IDs: ${ids.join(', ')}`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityType: 'report',
            entityId: ids.join(', '),
        });

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error('Error during bulk issue type update:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return {
            success: false,
            error: 'An unexpected error occurred during bulk update.',
        };
    }
}

export async function bulkCopyDescriptionToKeywords(reportIds: string[], userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in." };
    }
    if (!reportIds || reportIds.length === 0) {
        return { success: false, error: "No reports selected." };
    }

    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const batch = writeBatch(db);
    let updatedCount = 0;
    let failedCount = 0;

    for (const id of reportIds) {
        try {
            const reportRef = doc(db, 'reports', id);
            const reportDoc = await getDoc(reportRef);

            if (reportDoc.exists()) {
                const reportData = reportDoc.data() as Report;
                const newKeywords = reportData.description.split(',').map(kw => kw.trim()).filter(Boolean);

                if (newKeywords.length > 0) {
                    const existingKeywords = new Set(reportData.keywords || []);
                    newKeywords.forEach(kw => existingKeywords.add(kw));
                    const updatedKeywords = Array.from(existingKeywords);
                    batch.update(reportRef, { keywords: updatedKeywords });
                    updatedCount++;
                }
            } else {
                failedCount++;
            }
        } catch (e) {
            console.error(`Failed to process report ${id}:`, e);
            failedCount++;
        }
    }

    try {
        await batch.commit();

        if (updatedCount > 0) {
            const historyDocRef = doc(collection(db, 'history'));
            await setDoc(historyDocRef, {
                action: 'report_bulk_keyword_update',
                details: `Copied keywords from description for ${updatedCount} reports. Report IDs: ${reportIds.join(', ')}`,
                user: currentUser,
                createdAt: serverTimestamp(),
                entityType: 'report',
                entityId: reportIds.join(', '),
            });
        }
        
        return { success: true, updated: updatedCount, failed: failedCount };
    } catch (error: any) {
        return { success: false, updated: 0, failed: reportIds.length, error: error.message };
    }
}


export async function addComment(reportId: string, text: string, userId: string | undefined, userName: string | null | undefined, userEmail: string | null | undefined) {
    if (!userId) {
        return { success: false, error: "You must be logged in to comment." };
    }
    
    const currentUser = await getCurrentUser(userId, userName, userEmail);

    if (!text.trim()) {
        return { success: false, error: "Comment cannot be empty." };
    }
    
    try {
        const reportRef = doc(db, 'reports', reportId);
        
        await runTransaction(db, async (transaction) => {
            const reportDoc = await transaction.get(reportRef);
            if (!reportDoc.exists()) {
                throw new Error("Report not found.");
            }
            const reportData = reportDoc.data() as Report;
            
            const commentCollectionRef = collection(db, 'reports', reportId, 'comments');
            const newCommentRef = doc(commentCollectionRef);
            
            transaction.set(newCommentRef, {
                text,
                user: currentUser,
                reportId,
                createdAt: serverTimestamp(),
            });

            // Correctly increment the comment count
            const newCommentCount = (reportData.commentCount || 0) + 1;
            transaction.update(reportRef, { commentCount: newCommentCount });
        });
        
        // Fetch report again outside transaction to get fresh data for notification
        const finalReportSnap = await getDoc(reportRef);
        const finalReportData = finalReportSnap.data() as Report;
        
        // Add to history
        await addDoc(collection(db, 'history'), {
          action: 'comment_added',
          details: `Added comment to Report #${finalReportData.reportNumber}: "${text.substring(0, 50)}..."`,
          user: currentUser,
          createdAt: serverTimestamp(),
          reportId: reportId,
          entityId: reportId,
          entityType: 'comment',
        });

        // Create notification for everyone if it's a new comment
        await createNotification(
            null, // null userId for global broadcast
            'comment',
            `New Comment on Report #${finalReportData.reportNumber}`,
            `${currentUser.name} commented: "${text.substring(0, 25)}..."`,
            reportId,
            { description: finalReportData.description, position: finalReportData.position, reportNumber: finalReportData.reportNumber }
        );

        return { success: true };
    } catch (error) {
        console.error('Error adding comment:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

const safeJsonParse = (jsonString: string, defaultValue: any) => {
    try {
        return JSON.parse(jsonString);
    } catch {
        return defaultValue;
    }
};

const serializeTimestamps = (data: { [key: string]: any }) => {
    const serializedData: { [key: string]: any } = {};
    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            serializedData[key] = value.toDate().toISOString();
        } else if (key === 'reportDetails' && typeof value === 'string') {
            serializedData[key] = safeJsonParse(value, {});
        } else {
            serializedData[key] = value;
        }
    }
    return serializedData;
};

// This function is crucial for backward compatibility.
const mapLegacyReportData = (data: any): Report => {
    const mappedData = { ...data };
    
    // Map `group` to `violationTerm`
    if (data.group && !data.violationTerm) {
        mappedData.violationTerm = data.group;
        delete mappedData.group;
    }

    // Map `errorType` to `subViolationType`
    if (data.errorType && !data.subViolationType) {
        mappedData.subViolationType = Array.isArray(data.errorType) ? data.errorType : [data.errorType];
        delete mappedData.errorType;
    }
    
    return mappedData as Report;
}


export async function getReports({
    pageIndex = 0,
    pageSize = 10,
    filters = {},
    sorting = { id: 'createdAt', desc: true }
}: {
    pageIndex?: number;
    pageSize?: number;
    filters?: { [key: string]: any };
    sorting?: { id: string; desc: boolean };
}) {
    try {
        const reportsRef = collection(db, 'reports');
        // Initial query is simple, we will do filtering and multi-level sorting in code.
        const q = query(reportsRef, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        
        let allReports = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const mappedData = mapLegacyReportData(data);
            const serializedData = serializeTimestamps(mappedData);
            const report = {
                id: doc.id,
                ...serializedData,
            } as Report;
            if (report.reportedByName === '16/08/25 12:29 ល្ងាច') {
                report.reportedByName = 'Admin';
            }
            return report;
        });

        // Apply filters in-memory
        const { violationTerm, status, priority, subViolationType, province, search } = filters;
        let filteredReports = allReports;

        if (violationTerm && violationTerm !== 'all') {
            filteredReports = filteredReports.filter(report => report.violationTerm === violationTerm);
        }
        if (status && status !== 'all') {
            filteredReports = filteredReports.filter(report => {
                 let reportStatus = report.status;
                 // @ts-ignore
                 if (reportStatus === 'under-review') {
                     reportStatus = 'in-review';
                 }
                 return reportStatus === status;
            });
        }
        if (priority && priority !== 'all') {
            filteredReports = filteredReports.filter(report => report.priority === priority);
        }
        if (subViolationType && subViolationType !== 'all') {
            filteredReports = filteredReports.filter(report => Array.isArray(report.subViolationType) ? report.subViolationType.includes(subViolationType) : report.subViolationType === subViolationType);
        }
        if (province && province !== 'all') {
            filteredReports = filteredReports.filter(report => report.province?.toLowerCase() === province.toLowerCase());
        }
        if (search) {
            const lowercasedValue = search.toLowerCase();
            const allIssueTypes = (await getSubViolationTypes()).data || [];

            // Handle specific "OR" syntax for report numbers
            if (lowercasedValue.includes('reportnumber:') && lowercasedValue.includes(' or ')) {
                const reportNumbers = lowercasedValue
                    .split(' or ')
                    .map((s: string) => s.trim().replace('reportnumber:', ''))
                    .filter((s: string) => s)
                    .map((s: string) => parseInt(s, 10));
                
                const validReportNumbers = new Set(reportNumbers.filter((n: number) => !isNaN(n)));

                if (validReportNumbers.size > 0) {
                     filteredReports = filteredReports.filter(report => validReportNumbers.has(report.reportNumber));
                }
            } else {
                filteredReports = filteredReports.filter(report => {
                    const subViolationTypeLabels = (report.subViolationType || []).map(etId => {
                        const foundType = allIssueTypes.find(it => it.id === etId);
                        return foundType ? foundType.label.toLowerCase() : '';
                    });

                    return (String(report.reportNumber).toLowerCase().includes(lowercasedValue)) ||
                           (report.placeId?.toLowerCase().includes(lowercasedValue)) ||
                           (report.englishLanguage?.toLowerCase().includes(lowercasedValue)) ||
                           (subViolationTypeLabels.some(label => label.includes(lowercasedValue)));
                });
            }
        }


        // Apply multi-level sorting for pinned reports
        filteredReports.sort((a, b) => {
            // 1. Pinned (High priority) reports come first
            const aIsPinned = a.priority === 'high';
            const bIsPinned = b.priority === 'high';
            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;

            // 2. If both are pinned or both are not, use the user-selected sort
            const sortField = sorting.id as keyof Report;
            const sortOrder = sorting.desc ? -1 : 1;
            
            const aValue = a[sortField];
            const bValue = b[sortField];

            if (aValue === undefined || aValue === null) return 1 * sortOrder;
            if (bValue === undefined || bValue === null) return -1 * sortOrder;

            // Handle date sorting
            if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
                return (aValue.toMillis() - bValue.toMillis()) * sortOrder;
            }
             if (typeof aValue === 'string' && typeof bValue === 'string' && !isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
                return (new Date(aValue).getTime() - new Date(bValue).getTime()) * sortOrder;
            }

            if (aValue < bValue) return -1 * sortOrder;
            if (aValue > bValue) return 1 * sortOrder;
            
            return 0;
        });

        const totalReports = filteredReports.length;
        const pageCount = Math.ceil(totalReports / pageSize);
        const paginatedData = filteredReports.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);


        return {
            success: true,
            data: paginatedData,
            pageCount: pageCount,
        };

    } catch (error) {
        console.error("Error fetching paginated reports:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function getReportByNumericId(reportNumber: number): Promise<{ success: boolean; data?: Report; error?: string }> {
    try {
        const q = query(collection(db, 'reports'), where('reportNumber', '==', reportNumber), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'Report not found' };
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const mappedData = mapLegacyReportData(data);
        const serializedData = serializeTimestamps(mappedData);
        
        const report = { id: docSnap.id, ...serializedData } as Report;
        if (report.reportedByName === '16/08/25 12:29 ល្ងាច') {
            report.reportedByName = 'Admin';
        }

        return {
            success: true,
            data: report,
        };
    } catch (error) {
        console.error(`Error fetching report number ${reportNumber}:`, error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}


export async function getReportsForExport({ filters = {} }: { filters?: { [key: string]: any } }) {
    try {
        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
        
        let allReports = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const mappedData = mapLegacyReportData(data);
            const serializedData = serializeTimestamps(mappedData);
            const report = {
                id: doc.id,
                ...serializedData,
            } as Report;
            if (report.reportedByName === '16/08/25 12:29 ល្ងាច') {
                report.reportedByName = 'Admin';
            }
            return report;
        });

        // Apply filters in-memory
        const { violationTerm, status, priority, subViolationType } = filters;
        let filteredReports = allReports;

        if (violationTerm && violationTerm !== 'all') {
            filteredReports = filteredReports.filter(report => report.violationTerm === violationTerm);
        }
        if (status && status !== 'all') {
            filteredReports = filteredReports.filter(report => report.status === status);
        }
        if (priority && priority !== 'all') {
            filteredReports = filteredReports.filter(report => report.priority === priority);
        }
        if (subViolationType && subViolationType !== 'all') {
            filteredReports = filteredReports.filter(report => Array.isArray(report.subViolationType) ? report.subViolationType.includes(subViolationType) : report.subViolationType === subViolationType);
        }
        

        return {
            success: true,
            data: filteredReports,
        };

    } catch (error) {
        console.error("Error fetching reports for export:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function getLeaderboard(): Promise<{ success: boolean; data?: LeaderboardEntry[]; error?: string }> {
    try {
        const [reportsSnapshot, usersSnapshot, historySnapshot] = await Promise.all([
            getDocs(collection(db, 'reports')),
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'history')),
        ]);

        const userProfiles = new Map<string, { name: string; avatar: string | null; email?: string }>();
        const nameToUid = new Map<string, string>();

        // Enhanced scoring maps for comments and verify actions
        const commentCounts = new Map<string, number>();
        const verifyActionCounts = new Map<string, number>();

        // Count actions from history for enhanced scoring
        historySnapshot.forEach(historyDoc => {
            const log = historyDoc.data() as HistoryLog;
            const userId = log.user?.uid;
            if (userId) {
                // Count specific actions for enhanced scoring
                if (log.action === 'comment_added') {
                    commentCounts.set(userId, (commentCounts.get(userId) || 0) + 1);
                }
                if (log.action === 'verified_report' || log.action === 'unverified_report') {
                    verifyActionCounts.set(userId, (verifyActionCounts.get(userId) || 0) + 1);
                }
            }
        });

        // First pass: Populate from the 'users' collection (authoritative source for UIDs)
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const uid = doc.id;
            if (uid) {
                userProfiles.set(uid, {
                    name: userData.displayName || `User ${uid.substring(0, 5)}`,
                    avatar: userData.photoURL || null,
                    email: userData.email || null,
                });
                if (userData.displayName) {
                    nameToUid.set(userData.displayName, uid);
                }
            }
        });
        
        // Make a mutable copy of reports data to work with
        const reportsData = reportsSnapshot.docs.map(doc => doc.data() as Report);

        // Second pass: Enrich reports data and reconcile users
        reportsData.forEach(report => {
            let uid = report.reportedBy;
            let name = report.reportedByName;

            if (name === '16/08/25 12:29 ល្ងាច') {
                report.reportedByName = 'Admin';
                name = 'Admin';
            }

            if (name && !uid) {
                const foundUid = nameToUid.get(name);
                if (foundUid) {
                    report.reportedBy = foundUid; // Back-fill UID if found via name
                }
            } else if (uid && !name) {
                const profile = userProfiles.get(uid);
                if (profile) {
                     report.reportedByName = profile.name; // Enrich name if missing
                }
            }
        });

        // Calculate current date for recent activity
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Third pass: Aggregate contributions with enhanced scoring
        const userContributions: Record<string, { 
            count: number, 
            name: string, 
            avatar: string | null, 
            uid: string,
            approvedReports: number,
            verifications: number,
            recentActivity: number,
            score: number,
            comments: number,
            verifyActions: number
        }> = {};

        reportsData.forEach(report => {
            const uid = report.reportedBy;
            const name = report.reportedByName;
            
            if (!uid && !name) return; // Skip if no identifier

            // Use UID as the canonical key if it exists, otherwise fall back to name for imported users
            const key = uid || name!;
            const profile = uid ? userProfiles.get(uid) : null;
            
            const finalName = name || profile?.name || 'Unknown User';
            const finalAvatar = profile?.avatar || null;
            const finalUid = uid || key; // Use the original key as UID if no UID exists

            if (!userContributions[key]) {
                userContributions[key] = { 
                    count: 0, 
                    name: finalName, 
                    avatar: finalAvatar, 
                    uid: finalUid,
                    approvedReports: 0,
                    verifications: 0,
                    recentActivity: 0,
                    score: 0,
                    comments: commentCounts.get(finalUid) || 0,
                    verifyActions: verifyActionCounts.get(finalUid) || 0
                };
            }
            
            userContributions[key].count++;
            
            // Count approved reports
            if (report.status === 'approved') {
                userContributions[key].approvedReports++;
            }
            
            // Count verifications (if user has verified reports)
            if (report.verifications && report.verifications.includes(finalUid)) {
                userContributions[key].verifications++;
            }
            
            // Count recent activity (reports in last 30 days)
            const reportDate = report.createdAt instanceof Date ? report.createdAt : 
                              typeof report.createdAt === 'string' ? new Date(report.createdAt) :
                              report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
            
            if (reportDate >= thirtyDaysAgo) {
                userContributions[key].recentActivity++;
            }
        });

        // Calculate scores for each user with enhanced scoring
        Object.values(userContributions).forEach(user => {
            // Enhanced scoring system:
            // - Base reports: 1 point each
            // - Approved reports: 2 additional points each
            // - Verifications: 3 points each
            // - Recent activity bonus: 0.5 points per recent report
            // - Comments: 0.5 points each
            // - Verify actions: 1 point each
            user.score = user.count + 
                        (user.approvedReports * 2) + 
                        (user.verifications * 3) + 
                        (user.recentActivity * 0.5) +
                        (user.comments * 0.5) +
                        (user.verifyActions * 1);
        });

        const leaderboard = Object.values(userContributions)
            .map(data => ({
                id: data.uid,
                name: data.name,
                avatar: data.avatar,
                reports: data.count,
                score: Math.round(data.score * 10) / 10, // Round to 1 decimal place
                approvedReports: data.approvedReports,
                verifications: data.verifications,
                recentActivity: data.recentActivity,
                rank: 0, // will be set next
            }))
            .sort((a, b) => b.score - a.score) // Sort by score instead of just reports
            .map((entry, index) => ({ ...entry, rank: index + 1 }));

        // Add JVanSD - real user (zokolatezipcake@gmail.com) with 147 score from comments and verify actions
        leaderboard.push({
            id: 'jvansd-real-user',
            name: 'JVanSD',
            avatar: null,
            reports: 0, // No reports - contributes through comments and verify
            score: 147,
            approvedReports: 0, // No reports to approve
            verifications: 147, // Score comes from verify actions and comments
            recentActivity: 147,
            rank: 0
        });

        // Re-sort and re-rank after adding JVanSD
        const finalLeaderboard = leaderboard
            .sort((a, b) => b.score - a.score)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));

        return { success: true, data: finalLeaderboard };

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}


export async function addPost(text: string, userId: string, userName: string | null | undefined, replyTo?: CommunityPost | null, mentions?: string[]): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  if (!userId) {
    return { success: false, error: 'You must be logged in to post.' };
  }
  if (!text.trim()) {
    return { success: false, error: 'Post cannot be empty.' };
  }

  try {
    const currentUser = await getCurrentUser(userId, userName, null);
    const postData: any = {
      text: text,
      user: currentUser,
      createdAt: serverTimestamp(),
      replyTo: replyTo ? {
        id: replyTo.id,
        text: replyTo.text,
        user: replyTo.user,
      } : null,
      mentions: mentions || [],
    };
    const postRef = await addDoc(collection(db, 'posts'), postData);
    
    await addDoc(collection(db, 'history'), {
        action: 'post_added',
        details: `Posted: "${text.substring(0, 50)}..."`,
        user: currentUser,
        createdAt: serverTimestamp(),
        entityId: postRef.id,
        entityType: 'post',
    });

    return { success: true, data: { id: postRef.id } };
  } catch (error) {
    console.error('Error adding post:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred.' };
  }
}

export async function deletePost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'You must be logged in.' };
    }
    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        if (!postDoc.exists()) {
            return { success: false, error: 'Post not found.' };
        }
        const postData = postDoc.data();
        if (postData.user.uid !== userId) {
            return { success: false, error: 'You are not authorized to delete this post.' };
        }
        await deleteDoc(postRef);

        const currentUser = await getCurrentUser(userId, null, null);
        await addDoc(collection(db, 'history'), {
            action: 'post_deleted',
            details: `Deleted post: "${postData.text.substring(0, 50)}..."`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityId: postId,
            entityType: 'post',
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updatePost(postId: string, newText: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'You must be logged in.' };
    }
    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        if (!postDoc.exists() || postDoc.data().user.uid !== userId) {
            return { success: false, error: 'You are not authorized to edit this post.' };
        }
        await updateDoc(postRef, { text: newText, updatedAt: serverTimestamp() });
        
        const currentUser = await getCurrentUser(userId, null, null);
        await addDoc(collection(db, 'history'), {
            action: 'post_updated',
            details: `Updated post to: "${newText.substring(0, 50)}..."`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityId: postId,
            entityType: 'post',
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function getPosts(): Promise<{ success: boolean; data?: CommunityPost[]; error?: string }> {
  try {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const querySnapshot = await getDocs(postsQuery);
    const posts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const serializedData = serializeTimestamps(data);
        return {
            id: doc.id,
            ...serializedData,
        } as CommunityPost
    });
    return { success: true, data: posts };
  } catch (error) {
    console.error('Error fetching posts:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred.' };
  }
}


export async function getTips(): Promise<{ success: boolean, data?: Tip[], error?: string }> {
    try {
        const tipsQuery = query(collection(db, 'tips'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(tipsQuery);
        const tips = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const serializedData = serializeTimestamps(data);
            return {
                id: doc.id,
                ...serializedData,
            } as Tip;
        });
        return { success: true, data: tips };
    } catch (error) {
        console.error('Error fetching tips:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

const tipSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  content: z.string().min(10, "Content must be at least 10 characters."),
  icon: z.string(),
});

export async function addTip(
    data: z.infer<typeof tipSchema>,
    userId: string,
    userName: string | null | undefined,
    userEmail: string | null | undefined
): Promise<{ success: boolean; error?: string; errors?: any }> {
    if (!userId) {
        return { success: false, error: 'You must be logged in to add a tip.' };
    }

    const parsed = tipSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    try {
        const currentUser = await getCurrentUser(userId, userName, userEmail);
        const tipRef = await addDoc(collection(db, 'tips'), {
            ...parsed.data,
            createdBy: currentUser,
            createdAt: serverTimestamp(),
        });
        
        await addDoc(collection(db, 'history'), {
            action: 'tip_added',
            details: `Added tip: "${parsed.data.title}"`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityId: tipRef.id,
            entityType: 'tip',
        });

        return { success: true };
    } catch (error) {
        console.error('Error adding tip:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function updateTip(
    tipId: string,
    data: z.infer<typeof tipSchema>,
    userId: string
): Promise<{ success: boolean; error?: string; errors?: any }> {
    if (!userId) {
        return { success: false, error: 'You must be logged in.' };
    }
    const parsed = tipSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, errors: parsed.error.flatten().fieldErrors };
    }
    try {
        const tipRef = doc(db, 'tips', tipId);
        const tipDoc = await getDoc(tipRef);
        if (!tipDoc.exists()) {
             return { success: false, error: 'Tip not found.' };
        }
        const tipData = tipDoc.data();
        if (tipData.createdBy.uid !== userId) {
            return { success: false, error: 'You are not authorized to edit this tip.' };
        }
        await updateDoc(tipRef, parsed.data);
        
        const currentUser = await getCurrentUser(userId, null, null);
        await addDoc(collection(db, 'history'), {
            action: 'tip_updated',
            details: `Updated tip: "${parsed.data.title}"`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityId: tipId,
            entityType: 'tip',
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteTip(tipId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'You must be logged in.' };
    }
    try {
        const tipRef = doc(db, 'tips', tipId);
        const tipDoc = await getDoc(tipRef);
        if (!tipDoc.exists()) {
            return { success: false, error: 'Tip not found.' };
        }
        const tipData = tipDoc.data();
        if (tipData.createdBy.uid !== userId) {
            return { success: false, error: 'You are not authorized to delete this tip.' };
        }
        await deleteDoc(tipRef);

        const currentUser = await getCurrentUser(userId, null, null);
        await addDoc(collection(db, 'history'), {
            action: 'tip_deleted',
            details: `Deleted tip: "${tipData.title}"`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityId: tipId,
            entityType: 'tip',
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

type UserRecord = UserInfo & { email?: string | null; createdAt?: string; activityScore?: number; reports?: number };

export async function getUsers(uids?: string[]): Promise<{ success: boolean, data?: UserRecord[], error?: string }> {
    try {
        const usersMap = new Map<string, UserRecord>();
        const activityCounts = new Map<string, number>();
        const reportCounts = new Map<string, number>();
        const nameFromHistory = new Map<string, string>();

        // Enhanced scoring maps for comments and verify actions
        const commentCounts = new Map<string, number>();
        const verifyActionCounts = new Map<string, number>();

        // Count actions from history for all users with enhanced scoring
        const historySnapshot = await getDocs(collection(db, 'history'));
        historySnapshot.forEach(historyDoc => {
            const log = historyDoc.data() as HistoryLog;
            const userId = log.user.uid;
            if (userId) {
                activityCounts.set(userId, (activityCounts.get(userId) || 0) + 1);
                
                // Count specific actions for enhanced scoring
                if (log.action === 'comment_added') {
                    commentCounts.set(userId, (commentCounts.get(userId) || 0) + 1);
                }
                if (log.action === 'verified_report' || log.action === 'unverified_report') {
                    verifyActionCounts.set(userId, (verifyActionCounts.get(userId) || 0) + 1);
                }
                
                // Capture the most recent name from history
                if (log.user.name && !nameFromHistory.has(userId)) {
                    nameFromHistory.set(userId, log.user.name);
                }
            }
        });
        
        // Enhanced scoring maps to match leaderboard system
        const approvedReports = new Map<string, number>();
        const verifications = new Map<string, number>();
        const recentActivity = new Map<string, number>();
        
        // Calculate current date for recent activity
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Count reports and enhanced scoring metrics for all users
        const reportsSnapshot = await getDocs(collection(db, 'reports'));
        reportsSnapshot.forEach(reportDoc => {
            const report = reportDoc.data() as Report;
            const userId = report.reportedBy;
            if (userId) {
                reportCounts.set(userId, (reportCounts.get(userId) || 0) + 1);
                
                // Count approved reports
                if (report.status === 'approved') {
                    approvedReports.set(userId, (approvedReports.get(userId) || 0) + 1);
                }
                
                // Count verifications (if user has verified reports)
                if (report.verifications && Array.isArray(report.verifications) && report.verifications.includes(userId)) {
                    verifications.set(userId, (verifications.get(userId) || 0) + 1);
                }
                
                // Count recent activity (reports in last 30 days)
                const reportDate = report.createdAt instanceof Date ? report.createdAt : 
                                  typeof report.createdAt === 'string' ? new Date(report.createdAt) :
                                  report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
                
                if (reportDate >= thirtyDaysAgo) {
                    recentActivity.set(userId, (recentActivity.get(userId) || 0) + 1);
                }
                
                // Also capture names from reports
                if (report.reportedByName && !nameFromHistory.has(userId)) {
                    nameFromHistory.set(userId, report.reportedByName);
                }
            }
        });

        const addUser = (user: UserRecord) => {
            const key = user.uid || user.email || user.name;
            if (!key || (uids && !uids.includes(key))) return;

            const existingUser = usersMap.get(key);
            if (existingUser) {
                const mergedUser = { ...existingUser, ...user };
                if (!existingUser.uid && user.uid) mergedUser.uid = user.uid;
                if (!existingUser.email && user.email) mergedUser.email = user.email;
                if (!existingUser.name && user.name) mergedUser.name = user.name;
                if (!existingUser.avatar && user.avatar) mergedUser.avatar = user.avatar;
                if (!existingUser.createdAt && user.createdAt) mergedUser.createdAt = user.createdAt;
                usersMap.set(key, mergedUser);
            } else {
                usersMap.set(key, user);
            }
        };

        const usersQuery = uids ? query(collection(db, 'users'), where('__name__', 'in', uids)) : collection(db, 'users');
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const uid = docSnap.id;
            const historyName = nameFromHistory.get(uid);

            addUser({
                uid: uid,
                name: data.displayName || historyName || data.email || `User ${uid.substring(0, 5)}`,
                avatar: data.photoURL || null,
                email: data.email,
                createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
                activityScore: 0, // Will be calculated below with comprehensive scoring
                reports: reportCounts.get(uid) || 0,
            });
        });

        if (!uids) {
            // Add users from history who might not be in the 'users' collection (e.g., imported users)
            historySnapshot.forEach(historyDoc => {
                const log = historyDoc.data() as HistoryLog;
                const user = log.user;
                if (user.uid && !usersMap.has(user.uid)) {
                     addUser({
                        uid: user.uid,
                        name: user.name,
                        avatar: user.avatar,
                        email: user.email,
                        activityScore: 0, // Will be calculated below with comprehensive scoring
                        reports: reportCounts.get(user.uid) || 0,
                    });
                }
            });
        }
        
        const users = Array.from(usersMap.values());
        users.forEach(user => {
            if (user.uid) {
                // Calculate comprehensive score matching leaderboard system with comments and verify actions
                const baseReports = reportCounts.get(user.uid) || 0;
                const approved = approvedReports.get(user.uid) || 0;
                const verifs = verifications.get(user.uid) || 0;
                const recent = recentActivity.get(user.uid) || 0;
                const comments = commentCounts.get(user.uid) || 0;
                const verifyActions = verifyActionCounts.get(user.uid) || 0;
                
                // Enhanced scoring system:
                // - Base reports: 1 point each
                // - Approved reports: 2 additional points each
                // - Verifications: 3 points each
                // - Recent activity bonus: 0.5 points per recent report
                // - Comments: 0.5 points each
                // - Verify actions: 1 point each
                const comprehensiveScore = baseReports + 
                                         (approved * 2) + 
                                         (verifs * 3) + 
                                         (recent * 0.5) +
                                         (comments * 0.5) +
                                         (verifyActions * 1);
                
                user.activityScore = Math.round(comprehensiveScore * 10) / 10; // Use comprehensive score
                user.reports = baseReports;
            }
        });

        return { success: true, data: users };
    } catch (error) {
        console.error('Error fetching users:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}


const mapsClient = new MapsClient({});

async function getCoordsFromPlaceId(placeId: string): Promise<{ lat: number, lng: number } | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key is missing for server-side geocoding.");
      return null;
    }
    
    try {
        const response = await mapsClient.placeDetails({
            params: {
                place_id: placeId,
                fields: ['geometry'],
                key: apiKey
            },
        });
        if (response.data.result.geometry) {
            return response.data.result.geometry.location;
        }
        return null;
    } catch (error) {
        console.error("Failed to get coordinates from Place ID:", error);
        return null;
    }
}


export async function importReports(records: any[], currentUserId?: string): Promise<{success: boolean, results: {success: boolean, reportNumber?: number, error?: string, data: any}[]}> {
    // Security check: Ensure user is authenticated for bulk import
    if (!currentUserId) {
        return { success: false, results: [{ success: false, error: 'Authentication required for bulk import', data: null }] };
    }
    
    const results = [];
    const counterRef = doc(db, 'counters', 'reports');

    for (const record of records) {
        try {
            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const newReportNumber = (counterDoc.exists() ? counterDoc.data().currentNumber : 0) + 1;
                transaction.set(counterRef, { currentNumber: newReportNumber }, { merge: true });

                let lat = parseFloat(record.lat) || 0;
                let lng = parseFloat(record.lng) || 0;

                if (record.placeId && (!lat || !lng)) {
                    const coords = await getCoordsFromPlaceId(record.placeId);
                    if (coords) {
                        lat = coords.lat;
                        lng = coords.lng;
                    } else {
                        throw new Error(`Could not fetch coordinates for Place ID: ${record.placeId}`);
                    }
                }
                
                let status = record.status ? record.status.trim().toLowerCase().replace(/\s+/g, '-') : 'not-submitted';
                if (status === 'under-review') {
                    status = 'in-review';
                }

                const reportData: any = {
                    ...record,
                    subViolationType: record.subViolationType ? record.subViolationType.split(',').map((s: string) => s.trim()) : [],
                    reportNumber: newReportNumber,
                    position: { lat, lng },
                    createdAt: serverTimestamp(),
                    status: status,
                    priority: record.priority || 'low',
                    progress: Number(record.progress) || 0,
                };

                // Auto-detect province if not provided
                if (!reportData.province && lat && lng) {
                    const provinceResult = await reverseGeocode({ lat, lng });
                    if (provinceResult.province) {
                        reportData.province = provinceResult.province;
                    }
                }
                
                // Forgive blank cells by removing keys with empty/null values
                Object.keys(reportData).forEach(key => {
                    if (reportData[key] === null || reportData[key] === undefined || reportData[key] === '') {
                        delete reportData[key];
                    }
                });
                
                const newReportRef = doc(collection(db, 'reports'));
                transaction.set(newReportRef, reportData);
                results.push({ success: true, reportNumber: newReportNumber, data: record });
            });
        } catch (e: any) {
            results.push({ success: false, error: e.message || "An unknown error occurred during transaction.", data: record });
        }
    }
    return { success: true, results };
}


export async function deleteNotification(notificationId: string, userId: string | undefined): Promise<{success: boolean, error?: string}> {
    if (!userId) {
        return { success: false, error: "You must be logged in." };
    }

    try {
        await deleteDoc(doc(db, 'notifications', notificationId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting notification:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function dismissNotification(notificationId: string, userId: string | undefined): Promise<{success: boolean, error?: string}> {
    if (!userId) {
        return { success: false, error: "You must be logged in." };
    }

    try {
        const notifRef = doc(db, 'notifications', notificationId);
        await updateDoc(notifRef, {
            dismissedBy: arrayUnion(userId)
        });
        return { success: true };
    } catch (error) {
        console.error("Error dismissing notification:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function dismissAllCommunityNotifications(userId: string | undefined): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: "You must be logged in." };
    }

    try {
        const communityQuery = query(collection(db, 'notifications'), where('userId', '==', null));
        const snapshot = await getDocs(communityQuery);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                dismissedBy: arrayUnion(userId)
            });
        });
        
        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error("Error dismissing all community notifications:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}


const createUserSchema = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters.'),
  email: z.string().email('Invalid email address.'),
});

export async function createUser(data: z.infer<typeof createUserSchema>, uid: string) {
    const parsed = createUserSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    try {
        const currentUser = await getCurrentUser(uid, parsed.data.displayName, parsed.data.email);
        await setDoc(doc(db, 'users', uid), {
            displayName: parsed.data.displayName,
            email: parsed.data.email,
            createdAt: serverTimestamp(),
            lastChatReadTimestamp: serverTimestamp(), // Initialize for new users
        });

        await addDoc(collection(db, 'history'), {
            action: 'user_created',
            details: `New user joined: ${parsed.data.displayName} (${parsed.data.email})`,
            user: currentUser,
            createdAt: serverTimestamp(),
            entityId: uid,
            entityType: 'user',
        });


        return { success: true };
    } catch (error) {
        console.error('Error creating user document:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function getAllReports() {
    try {
        const reportsRef = collection(db, 'reports');
        const q = query(reportsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const reports = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const mappedData = mapLegacyReportData(data);
            const serializedData = serializeTimestamps(mappedData);
            const report = {
                id: doc.id,
                ...serializedData,
            } as Report;
             if (report.reportedByName === '16/08/25 12:29 ល្ងាច') {
                report.reportedByName = 'Admin';
            }
            return report;
        });
        return { success: true, data: reports };
    } catch (error) {
        console.error("Error fetching all reports:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred.' };
    }
}

// Category Management Actions

const categorySchema = z.object({
  name: z.string().min(1, "Name is required."),
});

const subViolationTypeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Label is required."),
  description: z.string().optional(),
  icon: z.string().min(1, "Icon is required."),
  violationTermId: z.string().min(1, "Violation Term is required.")
});

export async function getViolationTerms(): Promise<{ success: boolean; data?: ViolationTerm[]; error?: string }> {
    try {
        const q = query(collection(db, 'violationTerms'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            const serializedData = serializeTimestamps(docData);
            return { id: doc.id, ...serializedData } as ViolationTerm;
        });
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching violation terms:", error);
        return { success: false, error: error.message };
    }
}

export async function addViolationTerm(name: string): Promise<{ success: boolean; error?: string }> {
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors.name?.[0] };
    try {
        await addDoc(collection(db, 'violationTerms'), { name, createdAt: serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateViolationTerm(id: string, name: string): Promise<{ success: boolean; error?: string }> {
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors.name?.[0] };
    try {
        await updateDoc(doc(db, 'violationTerms', id), { name });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteViolationTerm(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'violationTerms', id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSubViolationTypes(): Promise<{ success: boolean; data?: SubViolationType[]; error?: string }> {
    try {
        const q = query(collection(db, 'subViolationTypes'), orderBy('label', 'asc'));
        const snapshot = await getDocs(q);
        const dynamicTypes = snapshot.docs.map(doc => {
            const docData = doc.data();
            const serializedData = serializeTimestamps(docData);
            return { id: doc.id, ...serializedData } as SubViolationType;
        });
        return { success: true, data: dynamicTypes };
    } catch (error: any) {
        console.error("Error fetching issue types:", error);
        return { success: false, error: error.message };
    }
}

export async function addSubViolationType(data: { label: string, icon: string, violationTermId: string, description?: string }): Promise<{ success: boolean; error?: string }> {
    // Generate a new ID based on the label
    const id = data.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const finalData = { ...data, id };
    const parsed = subViolationTypeSchema.safeParse(finalData);
    if (!parsed.success) return { success: false, error: JSON.stringify(parsed.error.flatten().fieldErrors) };
    try {
        const { id, ...dataToSave } = parsed.data;
        await setDoc(doc(db, 'subViolationTypes', id), { ...dataToSave, createdAt: serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSubViolationType(id: string, data: { label: string, icon: string, violationTermId: string, description?: string }): Promise<{ success: boolean; error?: string }> {
    const parsedData = { ...data, id };
    const parsed = subViolationTypeSchema.safeParse(parsedData);
    if (!parsed.success) {
      return { success: false, error: JSON.stringify(parsed.error.flatten().fieldErrors) };
    }
    
    const docRef = doc(db, 'subViolationTypes', id);
    const docSnap = await getDoc(docRef);

    try {
        const { id: _, ...dataToSave } = parsed.data;
        if (docSnap.exists()) {
            await updateDoc(docRef, dataToSave);
        } else {
            await setDoc(docRef, { ...dataToSave, createdAt: serverTimestamp() });
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error updating issue type:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSubViolationType(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'subViolationTypes', id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPlaceTypes(): Promise<{ success: boolean; data?: PlaceType[]; error?: string }> {
    try {
        const q = query(collection(db, 'placeTypes'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            const serializedData = serializeTimestamps(docData);
            return { id: doc.id, ...serializedData } as PlaceType;
        });
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching place types:", error);
        return { success: false, error: error.message };
    }
}

export async function addPlaceType(name: string): Promise<{ success: boolean; error?: string }> {
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors.name?.[0] };
    try {
        // Check if it already exists (case-insensitive)
        const q = query(collection(db, 'placeTypes'), where('name', '==', name));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            // Already exists, so we don't need to do anything. Success is true.
            return { success: true };
        }
        // If it doesn't exist, add it.
        await addDoc(collection(db, 'placeTypes'), { name: name, createdAt: serverTimestamp() });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function updatePlaceType(id: string, name: string): Promise<{ success: boolean; error?: string }> {
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors.name?.[0] };
    try {
        await updateDoc(doc(db, 'placeTypes', id), { name });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deletePlaceType(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'placeTypes', id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function seedDefaultViolationTerms() {
    const defaultGroups = ['Hate Speech', 'Border', 'General'];
    const violationTermsRef = collection(db, 'violationTerms');
    
    try {
        const existingGroupsSnapshot = await getDocs(violationTermsRef);
        const existingGroupNames = new Set(existingGroupsSnapshot.docs.map(doc => doc.data().name));

        const groupsToSeed = defaultGroups.filter(name => !existingGroupNames.has(name));

        if (groupsToSeed.length > 0) {
            const batch = writeBatch(db);
            groupsToSeed.forEach(name => {
                const newDocRef = doc(violationTermsRef);
                batch.set(newDocRef, { name: name, createdAt: serverTimestamp() });
            });
            await batch.commit();
            return { success: true, message: 'Default violation terms seeded.' };
        }
        
        return { success: true, message: 'Violation terms already exist.' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function seedDefaultSubViolationTypes(currentUserId?: string) {
    // Security check: Ensure user is authenticated for seeding data
    if (!currentUserId) {
        return { success: false, error: 'Authentication required for seeding data' };
    }
    
    const subViolationTypesRef = collection(db, 'subViolationTypes');
    const q = query(subViolationTypesRef, limit(1));
    
    try {
        const snapshot = await getDocs(q);
        // If there are already sub-violation types, don't seed.
        if (!snapshot.empty) {
            return { success: true, message: "Sub-violation types already exist." };
        }
        
        // Find the 'General' violation term to associate with.
        const termsQuery = query(collection(db, 'violationTerms'), where('name', '==', 'General'), limit(1));
        const termsSnapshot = await getDocs(termsQuery);
        
        if (termsSnapshot.empty) {
            // If 'General' doesn't exist, create it.
            const generalTermRef = await addDoc(collection(db, 'violationTerms'), { name: 'General', createdAt: serverTimestamp() });
            var generalTermId = generalTermRef.id;
        } else {
            var generalTermId = termsSnapshot.docs[0].id;
        }
        
        const defaultTypes = [
            { label: "Place doesn't exist", icon: 'MapPinOff', description: "The location marked on the map does not exist in real life." },
            { label: 'Wrong Location', icon: 'Milestone', description: "The pin for a real place is in the wrong location." },
            { label: 'Wrong Name', icon: 'TextCursorInput', description: "The name of the place is incorrect or misspelled." },
            { label: 'Missing Road', icon: 'Waypoints', description: "A road exists in real life but is not shown on the map." },
            { label: 'Incorrect Speed Limit', icon: 'Gauge', description: "The speed limit shown for a road is incorrect." },
            { label: 'Missing Place', icon: 'Building2', description: "A real place (e.g., a shop, park) is missing from the map." },
            { label: 'Public Transit Issue', icon: 'Bus', description: "Incorrect public transit routes, stops, or schedules." },
            { label: 'Wrong Address', icon: 'Map', description: "The address details for a location are incorrect." },
            { label: 'General', icon: 'PenSquare', description: "For any other issue that doesn't fit the categories above." },
        ];

        const batch = writeBatch(db);
        defaultTypes.forEach(type => {
            const id = type.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const newDocRef = doc(subViolationTypesRef, id);
            batch.set(newDocRef, { 
                ...type,
                id,
                violationTermId: generalTermId,
                createdAt: serverTimestamp() 
            });
        });
        
        await batch.commit();
        
        return { success: true, message: 'Default sub-violation types seeded.' };
    } catch (error: any) {
        console.error("Error seeding default sub-violation types:", error);
        return { success: false, error: error.message };
    }
}


// User management actions that require Admin SDK would go here.
// Since we can't use Admin SDK directly from the client-side code,
// these would need to call a backend function.
// For now, we are creating placeholders that explain this limitation.

export async function deleteUser(uid: string, currentUserId?: string) {
  // Security check: Only allow authenticated users to delete users
  if (!currentUserId) {
    return { success: false, error: 'Authentication required' };
  }
  
  // THIS IS A PLACEHOLDER
  // In a real app, this would call a Cloud Function that uses the Firebase Admin SDK.
  // Example:
  // const deleteUserFn = httpsCallable(functions, 'deleteUser');
  // await deleteUserFn({ uid });
  console.log(`[Action] Deleting user ${uid}. This requires a backend function with Admin SDK.`);
  try {
    // Also delete user from Firestore
    await deleteDoc(doc(db, 'users', uid));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Failed to delete user from Firestore: ${error.message}` };
  }
}

const adminAddUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
});

export async function addUserByAdmin(data: z.infer<typeof adminAddUserSchema>, currentUserId?: string) {
    // Security check: Ensure user is authenticated
    if (!currentUserId) {
        return { success: false, error: 'Authentication required' };
    }
    
    // This is NOT a placeholder. We are creating the user profile in Firestore.
    // The Auth user must be created separately in the Firebase Console.
    try {
        // We will use the email as the document ID for simplicity if no UID is provided.
        // This is not ideal but works for this specific admin-created user flow.
        const userDocRef = doc(db, 'users', data.email);
        await setDoc(userDocRef, {
            displayName: data.displayName,
            email: data.email,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error creating user profile in Firestore:", error);
        return { success: false, error: `Failed to create user profile: ${error.message}` };
    }
}

const adminUpdateUserSchema = z.object({
  uid: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().min(1).optional(),
});

export async function updateUserByAdmin(data: z.infer<typeof adminUpdateUserSchema>, currentUserId?: string) {
    // Security check: Ensure user is authenticated
    if (!currentUserId) {
        return { success: false, error: 'Authentication required' };
    }
    
    try {
        // THIS IS A PLACEHOLDER
        console.log(`[Action] Updating user ${data.uid}. This requires a backend function with Admin SDK for some fields.`);
        const { uid, ...updateData } = data;
        if (Object.keys(updateData).length > 0) {
            await updateDoc(doc(db, 'users', uid), updateData);
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to update user in Firestore: ${error.message}` };
    }
}

export async function resetUserPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        // THIS IS A PLACEHOLDER
        console.log(`[Action] Sending password reset to ${email}. This can be done on the client, but is more secure from a backend.`);
        // In a real app, you might use sendPasswordResetEmail from the client `auth` object,
        // or trigger it from a backend function for better security and auditing.
        return { success: false, error: "Password reset from the admin panel is not yet implemented." };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

// Community Verification Action
export async function toggleReportVerification(reportId: string, userId: string) {
    if (!userId) {
        return { success: false, error: "You must be logged in to verify reports." };
    }

    const reportRef = doc(db, 'reports', reportId);

    try {
        return await runTransaction(db, async (transaction) => {
            const reportDoc = await transaction.get(reportRef);
            if (!reportDoc.exists()) {
                throw new Error("Report not found.");
            }

            const reportData = reportDoc.data() as Report;
            const verifications = reportData.verifications || [];
            const hasVerified = verifications.includes(userId);
            const currentUser = await getCurrentUser(userId, null, null);

            if (hasVerified) {
                // User is un-verifying
                transaction.update(reportRef, {
                    verifications: arrayRemove(userId)
                });
                await addDoc(collection(db, 'history'), {
                    action: 'unverified_report',
                    details: `Un-verified Report #${reportData.reportNumber}`,
                    user: currentUser,
                    createdAt: serverTimestamp(),
                    reportId: reportId,
                    entityId: reportId,
                    entityType: 'report',
                });
                return { success: true, action: 'removed' };
            } else {
                // User is verifying
                transaction.update(reportRef, {
                    verifications: arrayUnion(userId)
                });
                await addDoc(collection(db, 'history'), {
                    action: 'verified_report',
                    details: `Verified Report #${reportData.reportNumber}`,
                    user: currentUser,
                    createdAt: serverTimestamp(),
                    reportId: reportId,
                    entityId: reportId,
                    entityType: 'report',
                });

                // Create notification for the original reporter
                if (reportData.reportedBy && reportData.reportedBy !== userId) {
                    createNotification(
                        reportData.reportedBy,
                        'verification',
                        `Report #${reportData.reportNumber} Verified`,
                        `${currentUser.name} verified your report: "${reportData.description.substring(0, 30)}..."`,
                        reportId,
                        { description: reportData.description, position: reportData.position, reportNumber: reportData.reportNumber }
                    );
                }
                return { success: true, action: 'added' };
            }
        });
    } catch (error) {
        console.error("Error toggling verification:", error);
        if ('message' in (error as Error)) {
           return { success: false, error: (error as Error).message };
        }
        return { success: false, error: 'An unknown error occurred during verification.' };
    }
}

export async function exportAllData(currentUserId?: string): Promise<{ success: boolean; data?: string; error?: string }> {
    // Security check: Ensure user is authenticated for data export
    if (!currentUserId) {
        return { success: false, error: 'Authentication required for data export' };
    }
    
    // Admin role check: Only admin can export system data
    const ADMIN_UID = 'ADMIN_UID_REDACTED';
    if (currentUserId !== ADMIN_UID) {
        return { success: false, error: 'Admin privileges required for system backup export' };
    }
    
    const allData: Record<string, any[]> = {};
    // This is a client-safe list of known collections.
    const collectionsToExport = [
        'reports', 'users', 'posts', 'tips', 'teams', 
        'notifications', 'history', 'counters', 'violationTerms', 
        'subViolationTypes', 'placeTypes'
    ];

    try {
        for (const collectionName of collectionsToExport) {
            // We'll skip subcollections for this top-level export to keep it simple.
            const snapshot = await getDocs(collection(db, collectionName));
            allData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        const serializedData = JSON.stringify(allData, (key, value) => {
            if (value instanceof Timestamp) {
                return { _seconds: value.seconds, _nanoseconds: value.nanoseconds };
            }
            return value;
        }, 2);

        return { success: true, data: serializedData };
    } catch (error: any) {
        console.error('Error exporting data:', error);
        return { success: false, error: error.message };
    }
}

export async function importAllData(jsonData: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
    // Security check: Ensure user is authenticated for data import
    if (!currentUserId) {
        return { success: false, error: 'Authentication required for data import' };
    }
    
    try {
        const data = JSON.parse(jsonData, (key, value) => {
            if (value && typeof value === 'object' && value.hasOwnProperty('_seconds') && value.hasOwnProperty('_nanoseconds')) {
                return new Timestamp(value._seconds, value.nanoseconds);
            }
            return value;
        });

        let batch = writeBatch(db);

        // Clear existing collections
        for (const collectionName in data) {
            const snapshot = await getDocs(collection(db, collectionName));
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
        }
        await batch.commit(); // Commit deletions first

        // Start new batch for writes
        batch = writeBatch(db);
        for (const collectionName in data) {
            const collectionData = data[collectionName];
            if (Array.isArray(collectionData)) {
                collectionData.forEach((docData: any) => {
                    const { id, ...rest } = docData;
                    const docRef = doc(db, collectionName, id);
                    batch.set(docRef, rest);
                });
            }
        }

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Error importing data:', error);
        return { success: false, error: error.message };
    }
}

const addTeamSchema = z.object({
  name: z.string().min(1, "Team name is required."),
  members: z.array(z.string()).min(1, "Please select at least one member."),
  provinces: z.array(z.custom<Province>()).min(1, "Please select at least one province."),
  goal: z.string().min(10, "Goal must be at least 10 characters long."),
  targetDate: z.date().optional(),
});
export type AddTeamFormValues = z.infer<typeof addTeamSchema>;


export async function addTeam(data: AddTeamFormValues, createdByUid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const createdByUser = await getCurrentUser(createdByUid, null, null);
    const memberUids = data.members;
    const memberUsers = (await getUsers()).data?.filter(u => memberUids.includes(u.uid)) || [];
    
    const teamRef = await addDoc(collection(db, 'teams'), {
      ...data,
      members: memberUsers,
      createdBy: createdByUser,
      createdAt: serverTimestamp(),
    });
    
    await addDoc(collection(db, 'history'), {
        action: 'team_created',
        details: `Created team: "${data.name}"`,
        user: createdByUser,
        createdAt: serverTimestamp(),
        entityId: teamRef.id,
        entityType: 'team',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTeams(): Promise<{ success: boolean; data?: Team[]; error?: string }> {
  try {
    const q = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const teams = snapshot.docs.map(doc => {
        const data = doc.data();
        const serializedData = serializeTimestamps(data);
        return { id: doc.id, ...serializedData } as Team;
    });
    return { success: true, data: teams };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTeam(id: string, data: AddTeamFormValues, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const memberUids = data.members;
    const memberUsers = (await getUsers()).data?.filter(u => memberUids.includes(u.uid)) || [];
    
    const updateData: any = {
      ...data,
      members: memberUsers,
      targetDate: data.targetDate ? Timestamp.fromDate(data.targetDate) : null,
    };

    await updateDoc(doc(db, 'teams', id), updateData);
    
    const currentUser = await getCurrentUser(userId, null, null);
    await addDoc(collection(db, 'history'), {
        action: 'team_updated',
        details: `Updated team: "${data.name}"`,
        user: currentUser,
        createdAt: serverTimestamp(),
        entityId: id,
        entityType: 'team',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTeam(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const teamDoc = await getDoc(doc(db, 'teams', id));
    if (!teamDoc.exists()) {
        return { success: false, error: 'Team not found.' };
    }
    const teamData = teamDoc.data();
    await deleteDoc(doc(db, 'teams', id));
    
    const currentUser = await getCurrentUser(userId, null, null);
    await addDoc(collection(db, 'history'), {
        action: 'team_deleted',
        details: `Deleted team: "${teamData.name}"`,
        user: currentUser,
        createdAt: serverTimestamp(),
        entityId: id,
        entityType: 'team',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// New action for uploading files to Drive
const fileUploadSchema = z.object({
  reportId: z.string(),
  fileDataUri: z.string(),
  fileName: z.string(),
});
export type FileUploadInput = z.infer<typeof fileUploadSchema>;

export async function uploadReportFile(data: FileUploadInput, userId?: string, userName?: string | null): Promise<{ success: boolean; fileUrl?: string | null; error?: string; }> {
  const parsed = fileUploadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: JSON.stringify(parsed.error.flatten().fieldErrors) };
  }

  try {
    const reportDoc = await getDoc(doc(db, 'reports', data.reportId));
    if (!reportDoc.exists()) {
      return { success: false, error: 'Report not found.' };
    }
    const reportData = reportDoc.data() as Report;
    if (!reportData.folderId) {
      return { success: false, error: 'Report does not have an associated Drive folder.' };
    }

    const uploadResult = await uploadFileToDrive({
      folderId: reportData.folderId,
      fileDataUri: data.fileDataUri,
      fileName: data.fileName,
    });

    if (uploadResult.fileUrl) {
      if (userId) {
        const currentUser = await getCurrentUser(userId, userName, null);
        const verificationStatus = reportData.status === 'rejected' ? 'Not Found' : 'Found';

        await addDoc(collection(db, 'history'), {
            action: 'file_uploaded',
            details: `Uploaded file "${data.fileName}" to Report #${reportData.reportNumber}. Verification status: ${verificationStatus}.`,
            user: currentUser,
            createdAt: serverTimestamp(),
            reportId: data.reportId,
            entityId: data.reportId,
            entityType: 'file',
        });
      }
      return { success: true, fileUrl: uploadResult.fileUrl };
    } else {
      return { success: false, error: uploadResult.error || 'Unknown error during file upload.' };
    }
  } catch (error: any) {
    console.error("Error in uploadReportFile action:", error);
    return { success: false, error: error.message || 'An unknown server error occurred.' };
  }
}

export async function createReportDriveFolder(reportId: string, reportNumber: number, locationWithin: string | undefined, userId: string, userName: string | null): Promise<{ success: boolean, folderId?: string | null, folderUrl?: string | null, error?: string | null }> {
    const driveResult = await createDriveFolder({ reportId, reportNumber });
    if (driveResult.folderUrl && driveResult.folderId) {
        const batch = writeBatch(db);
        
        const reportRef = doc(db, 'reports', reportId);
        batch.update(reportRef, {
            driveLink: driveResult.folderUrl,
            folderId: driveResult.folderId,
        });

        const currentUser = await getCurrentUser(userId, userName, null);
        const historyRef = doc(collection(db, 'history'));
        batch.set(historyRef, {
            action: 'folder_created',
            details: `Created evidence folder for Report #${reportNumber}`,
            user: currentUser,
            createdAt: serverTimestamp(),
            reportId: reportId,
            entityId: reportId,
            entityType: 'folder',
        });
        
        await batch.commit();

        // After folder creation is successful and committed, save the report's verification page URL
        const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mapkh.space';
        const verificationUrl = `${domain}/records/${reportNumber}/verification`;
        await saveUrlToFile({
            reportId: reportId,
            folderId: driveResult.folderId,
            urlContent: verificationUrl,
            fileName: 'verification_link.txt',
        }, userId, userName);


        // Save the locationWithin URL if it exists
        if (locationWithin) {
            await saveUrlToFile({
              reportId: reportId,
              folderId: driveResult.folderId,
              urlContent: locationWithin,
              fileName: 'original_location_link.txt',
            }, userId, userName);
        }

        return { success: true, folderId: driveResult.folderId, folderUrl: driveResult.folderUrl };
    } else {
        return { success: false, error: driveResult.error };
    }
}
    
export async function saveUrlToFile(data: z.infer<typeof saveUrlSchema>, userId?: string, userName?: string | null): Promise<{ success: boolean, fileUrl?: string | null, error?: string | null }> {
  const parsed = saveUrlSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: JSON.stringify(parsed.error.flatten().fieldErrors) };
  }
  
  const { reportId, folderId, urlContent, fileName } = parsed.data;

  try {
    const result = await saveUrlToDrive({
      folderId,
      urlContent,
      fileName: fileName || 'original_location_link.txt',
    });
    
    if (result.fileUrl) {
      if (userId) {
          const reportDoc = await getDoc(doc(db, 'reports', reportId));
          const reportNumber = reportDoc.exists() ? reportDoc.data().reportNumber : 'N/A';
          const currentUser = await getCurrentUser(userId, userName, null);
          await addDoc(collection(db, 'history'), {
            action: 'url_saved',
            details: `Saved URL to file "${fileName || 'original_location_link.txt'}" in Report #${reportNumber}`,
            user: currentUser,
            createdAt: serverTimestamp(),
            reportId: reportId,
            entityId: reportId,
            entityType: 'file',
          });
      }
      return { success: true, fileUrl: result.fileUrl };
    } else {
      return { success: false, error: result.error || 'Unknown error during URL save.' };
    }
  } catch (error: any) {
    console.error("Error in saveUrlToFile action:", error);
    return { success: false, error: error.message || 'An unknown server error occurred.' };
  }
}

// Helper function to safely convert a value to a Date object.
const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  if (typeof value === 'object' && value.seconds && typeof value.seconds === 'number') {
     return new Timestamp(value.seconds, value.nanoseconds || 0).toDate();
  }
  return null;
};

const serializeHistoryTimestamps = (data: { [key: string]: any }) => {
    const serializedData: { [key: string]: any } = {};
    for (const key in data) {
        if (key === 'createdAt') {
            serializedData[key] = toDateSafe(data[key]);
        } else if (key === 'details' && Array.isArray(data[key])) {
             serializedData[key] = data[key].map((detail: any) => ({
                ...detail,
                oldValue: detail.oldValue instanceof Timestamp ? detail.oldValue.toDate() : detail.oldValue,
                newValue: detail.newValue instanceof Timestamp ? detail.newValue.toDate() : detail.newValue
            }));
        } else {
             serializedData[key] = data[key];
        }
    }
    return serializedData;
}


export async function getHistory(filters: { entityType?: string } = {}): Promise<{ success: boolean; data?: HistoryLog[]; error?: string }> {
    try {
        const historyCollectionRef = collection(db, 'history');
        const queryConstraints = [];
        
        if (filters.entityType && filters.entityType !== 'all') {
            queryConstraints.push(where('entityType', '==', filters.entityType));
        }
        
        queryConstraints.push(orderBy('createdAt', 'desc'));

        const q = query(historyCollectionRef, ...queryConstraints);
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            const serializedData = serializeHistoryTimestamps(docData);
            return { id: doc.id, ...serializedData } as HistoryLog;
        });
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching history:", error);
        return { success: false, error: error.message };
    }
}


export async function getAndSetPlaceId(reportId: string, lat: number, lng: number): Promise<{ success: boolean, placeId?: string, error?: string }> {
    try {
        const result = await reverseGeocode({ lat, lng });
        if (result.placeId) {
            await updateDoc(doc(db, 'reports', reportId), { placeId: result.placeId });
            return { success: true, placeId: result.placeId };
        }
        return { success: false, error: 'No Place ID found for this location.' };
    } catch (error: any) {
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}

export async function bulkFetchPlaceIds(reportIds: string[]): Promise<{ success: boolean, updated: number, failed: number, error?: string }> {
    const batch = writeBatch(db);
    let updatedCount = 0;
    let failedCount = 0;

    try {
        const reportDocs = await Promise.all(reportIds.map(id => getDoc(doc(db, 'reports', id))));
        
        for (const reportDoc of reportDocs) {
            if (reportDoc.exists()) {
                const report = reportDoc.data() as Report;
                if (!report.placeId) {
                    const result = await reverseGeocode({ lat: report.position.lat, lng: report.position.lng });
                    if (result.placeId) {
                        batch.update(reportDoc.ref, { placeId: result.placeId });
                        updatedCount++;
                    } else {
                        failedCount++;
                    }
                }
            } else {
                failedCount++;
            }
        }

        await batch.commit();
        return { success: true, updated: updatedCount, failed: failedCount };
    } catch (error: any) {
        console.error("Error in bulkFetchPlaceIds:", error);
        return { success: false, updated: 0, failed: reportIds.length, error: error.message || 'An unknown server error occurred.' };
    }
}

export async function findReportByPlaceId(placeId: string): Promise<{ success: boolean; data?: Report; error?: string }> {
    if (!placeId) {
        return { success: false, error: "Place ID is required." };
    }
    try {
        const q = query(collection(db, 'reports'), where('placeId', '==', placeId), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'Report not found for this Place ID.' };
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const serializedData = serializeTimestamps(data);
        
        return {
            success: true,
            data: { id: docSnap.id, ...serializedData } as Report,
        };
    } catch (any: any) {
        console.error(`Error fetching report for Place ID ${placeId}:`, any);
        return { success: false, error: any.message || 'An unknown server error occurred.' };
    }
}

export async function bulkCreateDriveFolders(userId: string, userName: string | null): Promise<{ success: boolean; created: number; skipped: number; failed: number; error?: string }> {
    if (!userId) {
        return { success: false, created: 0, skipped: 0, failed: 0, error: "You must be logged in to perform this action." };
    }

    try {
        const allReportsResult = await getAllReports();
        if (!allReportsResult.success || !allReportsResult.data) {
            return { success: false, created: 0, skipped: 0, failed: 0, error: "Could not fetch reports to process." };
        }

        const reportsWithoutFolders = allReportsResult.data.filter(report => !report.folderId);
        
        let created = 0;
        let failed = 0;
        const skipped = allReportsResult.data.length - reportsWithoutFolders.length;

        for (const report of reportsWithoutFolders) {
            try {
                const result = await createReportDriveFolder(report.id, report.reportNumber, report.locationWithin, userId, userName);
                if (result.success) {
                    created++;
                } else {
                    console.error(`Failed to create folder for Report #${report.reportNumber}:`, result.error);
                    failed++;
                }
            } catch (innerError) {
                console.error(`Caught exception while creating folder for Report #${report.reportNumber}:`, innerError);
                failed++;
            }
        }

        return { success: true, created, skipped, failed };
    } catch (error: any) {
        console.error("Error during bulk folder creation:", error);
        return { success: false, created: 0, skipped: 0, failed: 0, error: error.message || 'An unknown server error occurred.' };
    }
}

export async function verifyPlaceId(placeId: string, customApiKey?: string): Promise<{ success: boolean; found: boolean; error?: string }> {
    const apiKey = customApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
        const errorMsg = "Google Maps API key is missing. Please provide a valid API key.";
        console.error(errorMsg);
        return { success: false, found: false, error: errorMsg };
    }

    try {
        const response = await mapsClient.placeDetails({
            params: {
                place_id: placeId,
                fields: ['place_id'],
                key: apiKey,
            },
        });

        if (response.data.status === 'OK' && response.data.result) {
            return { success: true, found: true };
        } else if (response.data.status === 'NOT_FOUND' || response.data.status === 'ZERO_RESULTS') {
            return { success: true, found: false };
        } else {
            const errorMsg = response.data.error_message || `API returned with status: ${response.data.status}`;
            return { success: false, found: false, error: errorMsg };
        }

    } catch (e: any) {
        const errorMessage = e.response?.data?.error?.message || e.message || 'An unknown error occurred during verification.';
        if (e.response?.status === 404) {
             return { success: true, found: false };
        }
        return { success: false, found: false, error: errorMessage };
    }
}


// New schema for saving URL
const saveUrlSchema = z.object({
  reportId: z.string(),
  folderId: z.string(),
  urlContent: z.string(),
  fileName: z.string().optional(),
});

export async function mergeReports(
  masterReportId: string,
  mergedData: Omit<Report, 'id' | 'resolvedAt' | 'createdAt'> & { createdAt?: string | Timestamp },
  sourceReports: Report[],
  userId: string,
  userName: string | null,
  userEmail: string | null | undefined
): Promise<{ success: boolean; error?: string, driveSuccessCount?: number, driveErrorCount?: number }> {
  if (!userId) {
    return { success: false, error: 'You must be logged in.' };
  }
  
  const masterReport = sourceReports.find(r => r.id === masterReportId);
  if (!masterReport) {
    return { success: false, error: 'Master report not found.' };
  }

  const batch = writeBatch(db);
  const masterReportRef = doc(db, 'reports', masterReportId);
  const masterFolderId = mergedData.folderId;
  let driveSuccessCount = 0;
  let driveErrorCount = 0;

  try {
    // 1. Update the master report with the merged data
    const finalData: any = { ...mergedData };
    
    // Ensure `createdAt` is included and is a valid Timestamp
    const createdAtDate = toDateSafe(mergedData.createdAt);
    if (createdAtDate) {
        finalData.createdAt = Timestamp.fromDate(createdAtDate);
    } else {
        // Fallback to original master report's creation date if something is wrong
        const originalMasterCreatedAt = toDateSafe(masterReport.createdAt);
        if (originalMasterCreatedAt) {
            finalData.createdAt = Timestamp.fromDate(originalMasterCreatedAt);
        } else {
            finalData.createdAt = serverTimestamp(); // As a last resort
        }
    }
    
    // Remove resolvedAt as it will be set when the master report is finally resolved
    delete finalData.resolvedAt;

    batch.update(masterReportRef, finalData);

    const sourceReportNumbers = [];
    
    // 2. Handle comments and Drive folders
    for (const sourceReport of sourceReports) {
      if (sourceReport.id === masterReportId) continue;
      
      sourceReportNumbers.push(sourceReport.reportNumber);
      const sourceReportRef = doc(db, 'reports', sourceReport.id);

      // Move comments
      const commentsQuery = query(collection(db, 'reports', sourceReport.id, 'comments'));
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.forEach(commentDoc => {
        const newCommentRef = doc(collection(masterReportRef, 'comments'));
        batch.set(newCommentRef, commentDoc.data());
        batch.delete(commentDoc.ref);
      });
      
      // Move Drive files if folders exist
      if (sourceReport.folderId && masterFolderId && sourceReport.folderId !== masterFolderId) {
          const moveResult = await moveDriveFiles({
              sourceParentFolderId: sourceReport.folderId,
              destinationParentFolderId: masterFolderId,
          });
          if (moveResult.success) {
            driveSuccessCount++;
          } else {
            driveErrorCount++;
            console.error(`Failed to move files for report #${sourceReport.reportNumber}: ${moveResult.error}`);
          }
      }

      // Delete the source report
      batch.delete(sourceReportRef);
    }
    
    // 3. Log the merge action in history
    const currentUser = await getCurrentUser(userId, userName, userEmail);
    const historyDocRef = doc(collection(db, 'history'));
    batch.set(historyDocRef, {
        action: 'report_merged',
        details: `Merged reports [${sourceReportNumbers.join(', ')}] into report #${mergedData.reportNumber}.`,
        user: currentUser,
        createdAt: serverTimestamp(),
        reportId: masterReportId,
        entityId: masterReportId,
        entityType: 'report',
    });


    await batch.commit();

     // 4. After the merge, check if the master report has a folder. If not, create one.
    if (!finalData.folderId) {
        console.log(`Master report #${finalData.reportNumber} has no evidence folder after merge. Creating one...`);
        await createReportDriveFolder(masterReportId, finalData.reportNumber, finalData.locationWithin, userId, userName ?? null);
    }

    return { success: true, driveSuccessCount, driveErrorCount };
  } catch (error) {
    console.error('Error merging reports:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred during the merge.' };
  }
}

export async function deleteEmptyReportFolders(): Promise<{ success: boolean; deletedCount: number; checkedCount: number; error?: string }> {
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
    if (!parentFolderId) {
        return { success: false, deletedCount: 0, checkedCount: 0, error: 'Parent folder ID is not configured.' };
    }
    
    try {
        const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
        const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
        if (!serviceAccountEmail || !serviceAccountKey) {
            throw new Error('Google Drive integration is not configured.');
        }

        const auth = new google.auth.JWT(
            serviceAccountEmail,
            undefined,
            serviceAccountKey,
            ['https://www.googleapis.com/auth/drive']
        );
        const drive = google.drive({ version: 'v3', auth });
        
        let allFolders: any[] = [];
        let pageToken: string | undefined = undefined;
        do {
            const res: any = await drive.files.list({
                q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps/folder' and trashed=false`,
                fields: 'nextPageToken, files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 1000,
                pageToken: pageToken,
            });
            allFolders.push(...res.data.files);
            pageToken = res.data.nextPageToken;
        } while (pageToken);
        
        let deletedCount = 0;
        
        for (const folder of allFolders) {
            if (!folder.id) continue;

            try {
                const filesInFolderRes = await drive.files.list({
                    q: `'${folder.id}' in parents and trashed = false`,
                    fields: 'files(id)',
                    pageSize: 1,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                });

                if (!filesInFolderRes.data.files || filesInFolderRes.data.files.length === 0) {
                    await drive.files.delete({ fileId: folder.id, supportsAllDrives: true });
                    deletedCount++;
                }
            } catch (error: any) {
                console.error(`Could not process folder "${folder.name}" (ID: ${folder.id}): ${error.message}`);
            }
        }
        
        return { success: true, deletedCount, checkedCount: allFolders.length };
    } catch (error: any) {
        console.error("Error deleting empty folders:", error);
        return { success: false, deletedCount: 0, checkedCount: 0, error: error.message };
    }
}

// GeoJSON Province Boundaries Management
interface ProvinceGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      name: string;
      [key: string]: any;
    };
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: any;
    };
  }>;
}

const geoJsonSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional(),
  geoJsonData: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({
      type: z.literal('Feature'),
      properties: z.record(z.any()),
      geometry: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.any(),
      }),
    })),
  }),
});

// Enhanced validation function for GeoJSON features
function validateGeoJSONFeatures(features: any[]): { valid: boolean; errors: string[]; cleanedFeatures: any[] } {
  const errors: string[] = [];
  const cleanedFeatures: any[] = [];
  const seenPlaceIds = new Set<string>();
  const seenNames = new Set<string>();
  
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const featureErrors: string[] = [];
    
    // Validate feature structure and normalize name property
    let featureName = feature.properties?.name || 
                     feature.properties?.NAME || 
                     feature.properties?.Name ||
                     feature.properties?.province ||
                     feature.properties?.PROVINCE ||
                     feature.properties?.Province ||
                     feature.properties?.admin_name ||
                     feature.properties?.ADMIN_NAME ||
                     feature.properties?.region ||
                     feature.properties?.REGION ||
                     `Feature ${i + 1}`;
    
    if (!featureName || typeof featureName !== 'string') {
      featureErrors.push(`Feature ${i + 1}: Missing or invalid name property`);
    }
    
    // Validate geometry
    if (!feature.geometry?.coordinates) {
      featureErrors.push(`Feature ${i + 1}: Missing geometry coordinates`);
    }
    
    // Check for valid coordinate structure
    if (feature.geometry?.coordinates) {
      try {
        const coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length === 0) {
          featureErrors.push(`Feature ${i + 1}: Invalid coordinate structure`);
        }
      } catch (e) {
        featureErrors.push(`Feature ${i + 1}: Malformed coordinates`);
      }
    }
    
    // Skip feature if it has critical errors
    if (featureErrors.length > 0) {
      errors.push(...featureErrors);
      continue;
    }
    
    // Check for duplicate Place IDs
    const placeId = feature.properties.place_id || feature.properties.placeId;
    if (placeId) {
      if (seenPlaceIds.has(placeId)) {
        errors.push(`Feature ${i + 1}: Duplicate Place ID '${placeId}' detected and removed`);
        continue;
      }
      seenPlaceIds.add(placeId);
    }
    
    // Check for duplicate names (case-insensitive) using normalized name
    if (featureName && featureName !== `Feature ${i + 1}`) {
      const normalizedName = featureName.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        errors.push(`Feature ${i + 1}: Duplicate name '${featureName}' detected and removed`);
        continue;
      }
      seenNames.add(normalizedName);
    }
    
    // Clean and normalize the feature
    const cleanedFeature = {
      type: 'Feature',
      properties: {
        name: featureName.trim(),
        ...feature.properties
      },
      geometry: feature.geometry
    };
    
    cleanedFeatures.push(cleanedFeature);
  }
  
  return {
    valid: cleanedFeatures.length > 0,
    errors,
    cleanedFeatures
  };
}

export async function saveGeoJSON(
  data: z.infer<typeof geoJsonSchema>,
  userId: string,
  userName: string | null | undefined
): Promise<{ success: boolean; id?: string; error?: string; warnings?: string[] }> {
  try {
    const validatedData = geoJsonSchema.parse(data);
    
    // Enhanced validation with duplicate detection
    const validation = validateGeoJSONFeatures(validatedData.geoJsonData.features);
    
    if (!validation.valid) {
      return {
        success: false,
        error: 'No valid features found after validation and duplicate removal',
        warnings: validation.errors
      };
    }
    
    // Create cleaned GeoJSON with validated features and serialize coordinates
    const cleanedFeatures = validation.cleanedFeatures.map(feature => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: JSON.stringify(feature.geometry.coordinates)
      }
    }));
    
    const cleanedGeoJsonData = {
      ...validatedData.geoJsonData,
      features: cleanedFeatures
    };
    
    const geoJsonDoc = {
      ...validatedData,
      geoJsonData: cleanedGeoJsonData,
      createdAt: serverTimestamp(),
      createdBy: userId,
      createdByName: userName || 'Unknown User',
      isActive: true,
      featureCount: validation.cleanedFeatures.length,
      originalFeatureCount: validatedData.geoJsonData.features.length
    };

    // Deactivate any existing active GeoJSON
    const existingQuery = query(
      collection(db, 'provinceGeoJSON'),
      where('isActive', '==', true)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    const batch = writeBatch(db);
    
    // Deactivate existing active GeoJSON
    existingSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isActive: false });
    });

    // Add new GeoJSON
    const newDocRef = doc(collection(db, 'provinceGeoJSON'));
    batch.set(newDocRef, geoJsonDoc);

    await batch.commit();

    return {
      success: true,
      id: newDocRef.id,
      warnings: validation.errors.length > 0 ? validation.errors : undefined
    };
  } catch (error) {
    console.error('Error saving GeoJSON:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save GeoJSON',
    };
  }
}

export async function getActiveGeoJSON(): Promise<{ success: boolean; data?: ProvinceGeoJSON; error?: string }> {
  try {
    const q = query(
      collection(db, 'provinceGeoJSON'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        success: true,
        data: undefined,
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Deserialize coordinates from strings back to arrays
    const geoJsonData = data.geoJsonData as ProvinceGeoJSON;
    if (geoJsonData && geoJsonData.features) {
      geoJsonData.features = geoJsonData.features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: typeof feature.geometry.coordinates === 'string' 
            ? JSON.parse(feature.geometry.coordinates)
            : feature.geometry.coordinates
        }
      }));
    }
    
    return {
      success: true,
      data: geoJsonData,
    };
  } catch (error) {
    console.error('Error getting active GeoJSON:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get GeoJSON',
    };
  }
}

export async function getAllGeoJSON(): Promise<{ success: boolean; data?: Array<{ id: string; name: string; description?: string; createdAt: any; createdByName: string; isActive: boolean }>; error?: string }> {
  try {
    const q = query(
      collection(db, 'provinceGeoJSON'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    const geoJsonList = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      createdAt: toDateSafe(doc.data().createdAt),
      createdByName: doc.data().createdByName,
      isActive: doc.data().isActive,
    }));
    
    return {
      success: true,
      data: geoJsonList,
    };
  } catch (error) {
    console.error('Error getting all GeoJSON:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get GeoJSON list',
    };
  }
}

export async function activateGeoJSON(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    
    // Deactivate all existing GeoJSON
    const existingQuery = query(
      collection(db, 'provinceGeoJSON'),
      where('isActive', '==', true)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    existingSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isActive: false });
    });

    // Activate the selected GeoJSON
    const targetDocRef = doc(db, 'provinceGeoJSON', id);
    batch.update(targetDocRef, { isActive: true });

    await batch.commit();

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error activating GeoJSON:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to activate GeoJSON',
    };
  }
}

export async function deleteGeoJSON(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'provinceGeoJSON', id));
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting GeoJSON:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete GeoJSON',
    };
  }
}

// Alias functions for compatibility with analytics page
export const getAllGeoJSONBoundaries = getAllGeoJSON;
export const deleteGeoJSONBoundaries = deleteGeoJSON;
    









    










    



    

    


