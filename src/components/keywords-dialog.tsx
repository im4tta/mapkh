
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, X, Tag } from 'lucide-react';
import { Report } from '@/lib/types';
import { updateReport } from '@/app/actions';
import { useAuth } from '@/context/auth-provider';
import { Badge } from './ui/badge';

interface KeywordsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
}

const keywordsSchema = z.object({
  newKeyword: z.string().optional(),
});

type KeywordsFormValues = z.infer<typeof keywordsSchema>;

export function KeywordsDialog({ isOpen, onClose, report }: KeywordsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<string[]>(report.keywords || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<KeywordsFormValues>({
    resolver: zodResolver(keywordsSchema),
    defaultValues: { newKeyword: '' },
  });

  useEffect(() => {
    setKeywords(report.keywords || []);
  }, [report]);

  const handleAddKeyword = () => {
    const newKeyword = form.getValues('newKeyword')?.trim();
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      form.setValue('newKeyword', '');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(kw => kw !== keywordToRemove));
  };

  const handleSave = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated'});
        return;
    }
    setIsSubmitting(true);
    const result = await updateReport(report.id, { keywords }, user.uid, user.displayName, user.email);

    if (result.success) {
      toast({ title: 'Keywords updated successfully!' });
      onClose();
    } else {
      toast({ variant: 'destructive', title: 'Failed to update keywords', description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Keywords for Report #{report.reportNumber}</DialogTitle>
          <DialogDescription>Add or remove keywords to improve searchability and categorization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              {...form.register('newKeyword')}
              placeholder="Add a keyword"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
            />
            <Button onClick={handleAddKeyword}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[4rem]">
            {keywords.length > 0 ? (
                keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                        {keyword}
                        <button onClick={() => handleRemoveKeyword(keyword)} className="rounded-full hover:bg-muted-foreground/20">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))
            ) : (
                <p className="text-sm text-muted-foreground p-2">No keywords added yet.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Keywords
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

