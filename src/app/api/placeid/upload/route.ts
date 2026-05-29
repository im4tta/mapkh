import { NextRequest, NextResponse } from 'next/server';
import { processCSVFile, type CSVRow } from '@/lib/csv-processor';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Process CSV file
    const csvResult = await processCSVFile(file);
    
    if (!csvResult.success || !csvResult.data) {
      return NextResponse.json(
        { 
          error: 'CSV processing failed',
          details: csvResult.errors,
          totalRows: csvResult.totalRows,
          validRows: csvResult.validRows,
          invalidRows: csvResult.invalidRows
        },
        { status: 400 }
      );
    }

    // Process each valid row
    const results = {
      updated: 0,
      notFound: 0,
      errors: [] as string[]
    };

    for (const row of csvResult.data) {
      try {
        // Find reports with matching placeId
        const reportsQuery = query(
          collection(db, 'reports'),
          where('placeId', '==', row.placeID)
        );
        
        const querySnapshot = await getDocs(reportsQuery);
        
        if (querySnapshot.empty) {
          results.notFound++;
          continue;
        }

        // Update all reports with this placeId
        const updatePromises = querySnapshot.docs.map(async (reportDoc) => {
          const currentData = reportDoc.data();
          
          // Only update if status is different
          if (currentData.status !== row.status) {
            await updateDoc(doc(db, 'reports', reportDoc.id), {
              status: row.status,
              updatedAt: Timestamp.now()
            });

            // Log the change in history
            await addDoc(collection(db, 'history'), {
              reportId: reportDoc.id,
              entityId: reportDoc.id,
              entityType: 'report',
              user: {
                uid: session.user!.id,
                name: session.user!.name,
                avatar: session.user!.image
              },
              action: 'status_updated_via_csv',
              details: [{
                field: 'status',
                oldValue: currentData.status,
                newValue: row.status
              }],
              createdAt: Timestamp.now()
            });
          }
        });

        await Promise.all(updatePromises);
        results.updated += querySnapshot.docs.length;
        
      } catch (error) {
        results.errors.push(`Failed to update PlaceID ${row.placeID}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'CSV processing completed',
      csvStats: {
        totalRows: csvResult.totalRows,
        validRows: csvResult.validRows,
        invalidRows: csvResult.invalidRows
      },
      updateStats: results,
      csvErrors: csvResult.errors
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://www.mapkh.space',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}