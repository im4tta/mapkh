"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ForceUpdateAction {
  id: string;
  adminEmail: string;
  timestamp: string;
  reason: string;
  targetVersion: string;
  usersTargeted: number;
  successCount: number;
  failureCount: number;
}

export const AdminForceUpdate: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [targetVersion, setTargetVersion] = useState('0.1.0');
  const [recentActions, setRecentActions] = useState<ForceUpdateAction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentActions();
  }, []);

  const loadRecentActions = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/force-update');
      if (response.ok) {
        const data = await response.json();
        setRecentActions(data.recentForceUpdates || []);
      }
    } catch (error) {
      console.error('Failed to load recent actions:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleForceUpdate = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the force update.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/force-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim(),
          targetVersion: targetVersion.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Force Update Sent! ✅",
          description: `Notifications sent to ${data.successCount} users. ${data.failureCount} failed.`,
        });

        // Clear form
        setReason('');
        
        // Reload recent actions
        await loadRecentActions();
      } else {
        throw new Error(data.error || 'Failed to send force update');
      }
    } catch (error) {
      console.error('Force update failed:', error);
      toast({
        title: "Force Update Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Force Cache Update
          </CardTitle>
          <CardDescription>
            Send push notifications to all users to force cache cleanup and app refresh.
            Use this for critical updates that require immediate cache invalidation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetVersion">Target Version</Label>
            <Input
              id="targetVersion"
              value={targetVersion}
              onChange={(e) => setTargetVersion(e.target.value)}
              placeholder="e.g., 0.1.1"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Force Update</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Critical security update, New Apple touch icons, Performance improvements..."
              rows={3}
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={isLoading || !reason.trim()}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending Force Update...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Force Update to All Users
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Confirm Force Update
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will send push notifications to ALL users asking them to refresh their app
                  and clear their cache. This action cannot be undone.
                  <br /><br />
                  <strong>Reason:</strong> {reason}
                  <br />
                  <strong>Target Version:</strong> {targetVersion}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleForceUpdate}>
                  Send Force Update
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Force Updates
          </CardTitle>
          <CardDescription>
            History of force update notifications sent to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading history...
            </div>
          ) : recentActions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No force updates have been sent yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActions.map((action) => (
                <div
                  key={action.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">
                        Version {action.targetVersion}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {formatTimestamp(action.timestamp)}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {action.reason}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>By: {action.adminEmail}</span>
                    <span>Targeted: {action.usersTargeted} users</span>
                    <span className="text-green-600">
                      Success: {action.successCount}
                    </span>
                    {action.failureCount > 0 && (
                      <span className="text-red-600">
                        Failed: {action.failureCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminForceUpdate;