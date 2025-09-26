
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Trash2, Edit, User, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTips, type Tip } from '@/hooks/use-tips';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { tipIcons, type TipIcon } from '@/lib/types';

// Simple tip item component
function TipItem({ tip, onEdit, onDelete, onView }: { 
  tip: Tip; 
  onEdit: (tip: Omit<Tip, 'id' | 'createdAt'>) => void; 
  onDelete: () => void; 
  onView: () => void;
}) {
  const IconComponent = tip.icon ? tipIcons[tip.icon] : null;
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {IconComponent ? (
              <IconComponent className="h-5 w-5 text-primary" />
            ) : (
              <span className="text-lg">💡</span>
            )}
            <CardTitle className="text-lg leading-tight">{tip.title}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onView}
              title="View tip details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <TipDialog
              tip={tip}
              onSave={onEdit}
              trigger={
                <Button variant="ghost" size="sm" title="Edit tip">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
              title="Delete tip"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-3">
          {tip.content}
        </CardDescription>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{tip.createdBy?.name || 'Unknown'}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tip.createdAt instanceof Date 
              ? tip.createdAt.toLocaleDateString()
              : new Date(tip.createdAt.seconds * 1000).toLocaleDateString()
            }
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Add/Edit Tip Dialog
function TipDialog({ tip, onSave, trigger }: { 
  tip?: Tip; 
  onSave: (tip: Omit<Tip, 'id' | 'createdAt'>) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(tip?.title || '');
  const [content, setContent] = useState(tip?.content || '');
  const [icon, setIcon] = useState<TipIcon | undefined>(tip?.icon || 'Info');

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    
    onSave({
      title: title.trim(),
      content: content.trim(),
      icon: icon,
      createdBy: { name: 'Current User', id: 'current' }, // TODO: Get from auth
      updatedAt: new Timestamp(Math.floor(Date.now() / 1000), 0) // Add updatedAt field as Firestore Timestamp
    });
    
    setOpen(false);
    if (!tip) {
      setTitle('');
      setContent('');
      setIcon('Info');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tip ? 'Edit Tip' : 'Add New Tip'}</DialogTitle>
          <DialogDescription>
            {tip ? 'Update your tip information.' : 'Share a helpful tip with the community.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter tip title..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter tip content..."
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon} onValueChange={(value: TipIcon) => setIcon(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an icon">
                  {icon && (
                    <div className="flex items-center gap-2">
                      {React.createElement(tipIcons[icon], { className: "h-4 w-4" })}
                      <span>{icon}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tipIcons).map(([key, IconComponent]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <span>{key}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
            {tip ? 'Update' : 'Add'} Tip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// View tip dialog component
function ViewTipDialog({ tip, open, onOpenChange }: { 
  tip: Tip; 
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const IconComponent = tip.icon ? tipIcons[tip.icon] : null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {IconComponent ? (
              <IconComponent className="h-5 w-5 text-primary" />
            ) : (
              <span className="text-xl">💡</span>
            )}
            {tip.title}
          </DialogTitle>
          <DialogDescription>
            View tip details and information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Content</Label>
            <div className="mt-1 p-3 bg-muted rounded-md">
              <p className="whitespace-pre-wrap">{tip.content}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Created By</Label>
              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{tip.createdBy?.name || 'Unknown'}</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Created At</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {tip.createdAt instanceof Date 
                  ? tip.createdAt.toLocaleDateString()
                  : new Date(tip.createdAt.seconds * 1000).toLocaleDateString()
                }
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main TipsSection component
export function TipsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { tips, isLoading, error, addTip, updateTip, deleteTip, refreshTips } = useTips();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTip, setViewTip] = useState<Tip | null>(null);

  // Filter tips based on search query
  const filteredTips = tips.filter(tip =>
    tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tip.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tip.createdBy?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle CRUD operations with toast notifications
  const handleAddTip = async (tipData: Omit<Tip, 'id' | 'createdAt'>) => {
    try {
      await addTip(tipData);
      toast({
        title: "Success",
        description: "Tip added successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add tip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTip = async (id: string, tipData: Omit<Tip, 'id' | 'createdAt'>) => {
    try {
      await updateTip(id, tipData);
      toast({
        title: "Success",
        description: "Tip updated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTip = async (id: string) => {
    try {
      await deleteTip(id);
      toast({
        title: "Success",
        description: "Tip deleted successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tip. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex-1">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Tips & Guidelines
              <Badge variant="secondary">{tips.length}</Badge>
            </CardTitle>
            <CardDescription>
              Helpful tips and best practices for map corrections
            </CardDescription>
          </div>
          <TipDialog
            onSave={handleAddTip}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Tip
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tips list */}
        <div className="space-y-4">
          {filteredTips.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No tips found matching your search.' : 'No tips available yet.'}
              </p>
              {!searchQuery && (
                <TipDialog
                  onSave={handleAddTip}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Tip
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            filteredTips.map(tip => (
              <TipItem
                key={tip.id}
                tip={tip}
                onEdit={(updatedTip) => handleUpdateTip(tip.id, updatedTip)}
                onDelete={() => handleDeleteTip(tip.id)}
                onView={() => setViewTip(tip)}
              />
            ))
          )}
        </div>
      </CardContent>
      
      {/* View tip dialog */}
      {viewTip && (
        <ViewTipDialog
          tip={viewTip}
          open={!!viewTip}
          onOpenChange={(open) => !open && setViewTip(null)}
        />
      )}
    </Card>
  );
}
