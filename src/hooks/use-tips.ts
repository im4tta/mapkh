"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { db } from '@/lib/firebase';
import { z } from 'zod';
import { type TipIcon } from '@/lib/types';

export interface Tip {
  id: string;
  title: string;
  content: string;
  icon?: TipIcon;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: {
    id: string;
    name: string;
  };
}

export interface CreateTipData {
  title: string;
  content: string;
  icon?: TipIcon;
}

export interface UpdateTipData {
  title?: string;
  content?: string;
  icon?: TipIcon;
}

// Validation schemas
const createTipSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .refine(title => !/^\s*$/.test(title), 'Title cannot be only whitespace'),
  content: z.string()
    .min(1, 'Content is required')
    .max(2000, 'Content must be less than 2000 characters')
    .trim()
    .refine(content => !/^\s*$/.test(content), 'Content cannot be only whitespace'),
  icon: z.enum(['Star', 'CheckSquare', 'Target', 'BookOpen', 'Info', 'HelpCircle'])
    .optional()
});

const updateTipSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .refine(title => !/^\s*$/.test(title), 'Title cannot be only whitespace')
    .optional(),
  content: z.string()
    .min(1, 'Content is required')
    .max(2000, 'Content must be less than 2000 characters')
    .trim()
    .refine(content => !/^\s*$/.test(content), 'Content cannot be only whitespace')
    .optional(),
  icon: z.enum(['Star', 'CheckSquare', 'Target', 'BookOpen', 'Info', 'HelpCircle'])
    .optional()
});

// Collection reference
const tipsCollection = collection(db, 'tips');

/**
 * Service class for managing tips
 */
class TipService {
  /**
   * Add a new tip
   */
  static async addTip(
    data: CreateTipData, 
    userId?: string
  ): Promise<{ success: true; id: string } | { success: false; error: string }> {
    try {
      // Validate input data
      const validatedData = createTipSchema.parse(data);
      
      // Create tip document
      const docRef = await addDoc(tipsCollection, {
        title: validatedData.title,
        content: validatedData.content,
        icon: validatedData.icon || '💡',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId ? {
          id: userId,
          name: 'Current User' // This should be replaced with actual user data
        } : undefined
      });

      return { success: true, id: docRef.id };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      console.error('Error adding tip:', error);
      return { success: false, error: 'Failed to add tip' };
    }
  }

  /**
   * Update an existing tip
   */
  static async updateTip(
    id: string, 
    data: UpdateTipData
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      // Validate input data
      const validatedData = updateTipSchema.parse(data);
      
      // Check if there's anything to update
      if (Object.keys(validatedData).length === 0) {
        return { success: false, error: 'No data provided for update' };
      }

      // Update tip document
      const docRef = doc(tipsCollection, id);
      await updateDoc(docRef, {
        ...validatedData,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      console.error('Error updating tip:', error);
      return { success: false, error: 'Failed to update tip' };
    }
  }

  /**
   * Delete a tip
   */
  static async deleteTip(
    id: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const docRef = doc(tipsCollection, id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting tip:', error);
      return { success: false, error: 'Failed to delete tip' };
    }
  }

  /**
   * Get all tips
   */
  static async getTips(): Promise<Tip[]> {
    try {
      const q = query(tipsCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Tip));
    } catch (error) {
      console.error('Error fetching tips:', error);
      return [];
    }
  }

  /**
   * Subscribe to tips changes
   */
  static subscribeToTips(
    callback: (tips: Tip[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(tipsCollection, orderBy('createdAt', 'desc'));
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const tips = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Tip));
        callback(tips);
      },
      (error) => {
        console.error('Error in tips subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );
  }

  /**
   * Get tips count
   */
  static async getTipsCount(): Promise<number> {
    try {
      const querySnapshot = await getDocs(tipsCollection);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting tips count:', error);
      return 0;
    }
  }
}

export function useTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to tips changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = TipService.subscribeToTips(
      (newTips) => {
        setTips(newTips);
        setIsLoading(false);
      },
      (error) => {
        setError(error.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Add tip function
  const addTip = useCallback(async (tipData: Omit<Tip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await TipService.addTip({
      title: tipData.title,
      content: tipData.content,
      icon: tipData.icon
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.id;
  }, []);

  // Update tip function
  const updateTip = useCallback(async (id: string, tipData: Omit<Tip, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await TipService.updateTip(id, {
      title: tipData.title,
      content: tipData.content,
      icon: tipData.icon
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
  }, []);

  // Delete tip function
  const deleteTip = useCallback(async (id: string) => {
    const result = await TipService.deleteTip(id);
    
    if (!result.success) {
      throw new Error(result.error);
    }
  }, []);

  // Refresh tips function
  const refreshTips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newTips = await TipService.getTips();
      setTips(newTips);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh tips');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    tips,
    isLoading,
    error,
    addTip,
    updateTip,
    deleteTip,
    refreshTips
  };
}