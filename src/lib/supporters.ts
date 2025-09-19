/**
 * Supporter management service for Firestore
 * Provides CRUD operations with validation and security
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { z } from 'zod';

// TypeScript interfaces
export interface Supporter {
  id: string;
  name: string;
  message?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User ID who added the supporter
}

export interface CreateSupporterData {
  name: string;
  message?: string;
}

export interface UpdateSupporterData {
  name?: string;
  message?: string;
}

// Validation schemas
const createSupporterSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .refine(name => !/^\s*$/.test(name), 'Name cannot be only whitespace'),
  message: z.string()
    .max(500, 'Message must be less than 500 characters')
    .trim()
    .optional()
});

const updateSupporterSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .refine(name => !/^\s*$/.test(name), 'Name cannot be only whitespace')
    .optional(),
  message: z.string()
    .max(500, 'Message must be less than 500 characters')
    .trim()
    .optional()
});

// Collection reference
const supportersCollection = collection(db, 'supporters');

/**
 * Service class for managing supporters
 */
export class SupporterService {
  /**
   * Add a new supporter
   */
  static async addSupporter(
    data: CreateSupporterData, 
    userId: string
  ): Promise<{ success: true; id: string } | { success: false; error: string }> {
    try {
      // Validate input data
      const validatedData = createSupporterSchema.parse(data);
      
      // Check for duplicate names
      const existingSupporter = await this.getSupporterByName(validatedData.name);
      if (existingSupporter) {
        return { success: false, error: 'A supporter with this name already exists' };
      }

      // Create supporter document
      const docRef = await addDoc(supportersCollection, {
        name: validatedData.name,
        message: validatedData.message || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId
      });

      return { success: true, id: docRef.id };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      console.error('Error adding supporter:', error);
      return { success: false, error: 'Failed to add supporter' };
    }
  }

  /**
   * Update an existing supporter
   */
  static async updateSupporter(
    id: string, 
    data: UpdateSupporterData
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      // Validate input data
      const validatedData = updateSupporterSchema.parse(data);
      
      // Check if there's anything to update
      if (Object.keys(validatedData).length === 0) {
        return { success: false, error: 'No data provided for update' };
      }

      // Check for duplicate names if name is being updated
      if (validatedData.name) {
        const existingSupporter = await this.getSupporterByName(validatedData.name);
        if (existingSupporter && existingSupporter.id !== id) {
          return { success: false, error: 'A supporter with this name already exists' };
        }
      }

      // Update supporter document
      const docRef = doc(supportersCollection, id);
      await updateDoc(docRef, {
        ...validatedData,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      console.error('Error updating supporter:', error);
      return { success: false, error: 'Failed to update supporter' };
    }
  }

  /**
   * Delete a supporter
   */
  static async deleteSupporter(
    id: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const docRef = doc(supportersCollection, id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting supporter:', error);
      return { success: false, error: 'Failed to delete supporter' };
    }
  }

  /**
   * Get all supporters (one-time fetch)
   */
  static async getSupporters(): Promise<Supporter[]> {
    try {
      const q = query(supportersCollection, orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Supporter[];
    } catch (error) {
      console.error('Error fetching supporters:', error);
      return [];
    }
  }

  /**
   * Get supporter by name (for duplicate checking)
   */
  private static async getSupporterByName(name: string): Promise<Supporter | null> {
    try {
      const supporters = await this.getSupporters();
      return supporters.find(supporter => 
        supporter.name.toLowerCase() === name.toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Error checking supporter name:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time supporters updates
   */
  static subscribeToSupporters(
    callback: (supporters: Supporter[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(supportersCollection, orderBy('createdAt', 'asc'));
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const supporters = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Supporter[];
        callback(supporters);
      },
      (error) => {
        console.error('Error in supporters subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );
  }

  /**
   * Get supporters count
   */
  static async getSupportersCount(): Promise<number> {
    try {
      const supporters = await this.getSupporters();
      return supporters.length;
    } catch (error) {
      console.error('Error getting supporters count:', error);
      return 0;
    }
  }

  /**
   * Migrate existing localStorage supporters to Firestore
   * This is a one-time migration utility
   */
  static async migrateFromLocalStorage(
    userId: string
  ): Promise<{ success: true; migrated: number } | { success: false; error: string }> {
    try {
      // Check if localStorage has supporters
      const localSupporters = localStorage.getItem('mapkh_supporters');
      if (!localSupporters) {
        return { success: true, migrated: 0 };
      }

      const supporterNames: string[] = JSON.parse(localSupporters);
      if (!Array.isArray(supporterNames) || supporterNames.length === 0) {
        return { success: true, migrated: 0 };
      }

      // Check if Firestore already has supporters
      const existingSupporters = await this.getSupporters();
      if (existingSupporters.length > 0) {
        return { success: false, error: 'Supporters already exist in database' };
      }

      // Migrate each supporter
      let migratedCount = 0;
      for (const name of supporterNames) {
        if (typeof name === 'string' && name.trim()) {
          const result = await this.addSupporter({ name: name.trim() }, userId);
          if (result.success) {
            migratedCount++;
          }
        }
      }

      // Clear localStorage after successful migration
      if (migratedCount > 0) {
        localStorage.removeItem('mapkh_supporters');
      }

      return { success: true, migrated: migratedCount };
    } catch (error) {
      console.error('Error migrating supporters:', error);
      return { success: false, error: 'Failed to migrate supporters' };
    }
  }
}

// Export utility functions for backward compatibility
export const {
  addSupporter,
  updateSupporter,
  deleteSupporter,
  getSupporters,
  subscribeToSupporters,
  getSupportersCount,
  migrateFromLocalStorage
} = SupporterService;