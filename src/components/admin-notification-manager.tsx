'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Send,
  Users,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Target,
  Globe,
  MapPin,
  Loader2,
  Eye,
  Trash2,
  Edit,
  History
} from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { notificationCategories, type NotificationCategory } from '@/lib/notification-config';
import { usePushNotification } from '@/context/push-notification-provider';

// Types for notification management
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  hasNotifications: boolean;
  lastActive?: string;
  groups: string[];
}

interface Group {
  id: string;
  name: string;
  description: string;
  userIds: string[];
  createdAt: string;
}

interface NotificationTarget {
  type: 'all' | 'individual' | 'group' | 'location';
  userIds?: string[];
  groupId?: string;
  location?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
}

interface NotificationSchedule {
  immediate: boolean;
  scheduledDate?: Date;
  scheduledTime?: string;
}

interface NotificationComposition {
  title: string;
  body: string;
  category: string;
  icon?: string;
  url?: string;
  target: NotificationTarget;
  schedule: NotificationSchedule;
  priority: 'low' | 'normal' | 'high';
}

interface NotificationDelivery {
  id: string;
  composition: NotificationComposition;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  targetCount: number;
  deliveredCount: number;
  failedCount: number;
  error?: string;
}

export function AdminNotificationManager() {
  const [composition, setComposition] = useState<NotificationComposition>({
    title: '',
    body: '',
    category: 'system',
    target: { type: 'all' },
    schedule: { immediate: true },
    priority: 'normal'
  });
  
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { isSupported, hasPermission } = usePushNotification();
  const { user } = useAuth();

  // Filter deliveries based on status
  const filteredDeliveries = deliveries.filter(delivery => {
    if (statusFilter === 'all') return true;
    return delivery.status === statusFilter;
  });

  // Load delivery history and users on component mount
  useEffect(() => {
    loadDeliveryHistory();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!user) return;
    
    setLoadingUsers(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/notifications/users?hasNotifications=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setGroups(data.groups || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to load users`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error Loading Users",
        description: `Failed to load users: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDeliveryHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/notifications/history?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to load delivery history`);
      }
    } catch (error) {
      console.error('Error loading delivery history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error Loading History",
        description: `Failed to load delivery history: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateComposition = (updates: Partial<NotificationComposition>) => {
    setComposition(prev => ({ ...prev, ...updates }));
  };

  const updateTarget = (updates: Partial<NotificationTarget>) => {
    updateComposition({
      target: { ...composition.target, ...updates }
    });
  };

  const updateSchedule = (updates: Partial<NotificationSchedule>) => {
    updateComposition({
      schedule: { ...composition.schedule, ...updates }
    });
  };

  const validateComposition = (): string | null => {
    if (!composition.title.trim()) return 'Title is required';
    if (!composition.body.trim()) return 'Message body is required';
    if (!composition.schedule.immediate && !selectedDate) return 'Scheduled date is required';
    if (!composition.schedule.immediate && !selectedTime) return 'Scheduled time is required';
    return null;
  };

  const sendNotification = async () => {
    const validationError = validateComposition();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      });
      return;
    }

    // Additional validation for scheduled notifications in the past
    if (!composition.schedule.immediate && selectedDate && selectedTime) {
      const scheduledDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        toast({
          title: 'Validation Error',
          description: 'Scheduled time must be in the future.',
          variant: 'destructive'
        });
        return;
      }
    }

    // Validate target selection for individual targeting
    if (composition.target.type === 'individual' && (!selectedUsers || selectedUsers.length === 0)) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one user for individual targeting.',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to send notifications.',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    try {
      // Prepare the final composition
      const finalComposition = {
        ...composition,
        schedule: {
          ...composition.schedule,
          scheduledDate: selectedDate,
          scheduledTime: selectedTime
        }
      };

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalComposition)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Notification sent successfully! Delivered to ${result.deliveredCount || 0} users.`,
          variant: 'default'
        });
        
        // Reset form
        setComposition({
          title: '',
          body: '',
          category: 'system',
          target: { type: 'all' },
          schedule: { immediate: true },
          priority: 'normal'
        });
        setSelectedDate(undefined);
        setSelectedTime('');
        setSelectedUsers([]);
        
        // Reload delivery history
        loadDeliveryHistory();
      } else {
        throw new Error(result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send notification. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: NotificationDelivery['status']) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'sending': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTargetDescription = (target: { type: string; groupId?: string; userIds?: string[]; location?: { radius: number } }) => {
    switch (target.type) {
      case 'all':
        return 'All users';
      case 'group':
        return `Group: ${target.groupId}`;
      case 'individual':
        return `${target.userIds?.length || 0} selected users`;
      case 'location':
        return `Location-based (${target.location?.radius}km radius)`;
      default:
        return 'Unknown target';
    }
  };

  const getStatusVariant = (status: NotificationDelivery['status']) => {
    switch (status) {
      case 'sent': return 'default';
      case 'pending': return 'secondary';
      case 'sending': return 'outline';
      case 'failed': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const viewNotificationDetails = (id: string) => {
    // Find the notification and show details
    const notification = deliveries.find((n: NotificationDelivery) => n.id === id);
    if (notification) {
      alert(`Notification Details:\n\nID: ${notification.id}\nTitle: ${notification.composition.title}\nMessage: ${notification.composition.body}\nType: ${notification.composition.category}\nCreated: ${notification.createdAt?.toLocaleString?.() || 'Unknown'}\nSent to: ${notification.targetCount || 0} users`);
    }
    console.log('View details for notification:', id);
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setDeliveries(prev => prev.filter(d => d.id !== id));
        toast({
          title: 'Success',
          description: 'Notification deleted successfully',
        });
      } else {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive'
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notification Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in this environment.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notification Management
          </CardTitle>
          <CardDescription>
            Send push notifications to users. Compose messages, select targets, and schedule delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="compose" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose">Compose Notification</TabsTrigger>
              <TabsTrigger value="history">Delivery History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="compose" className="space-y-6">
              {/* Notification Composition Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Notification Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter notification title"
                      value={composition.title}
                      onChange={(e) => updateComposition({ title: e.target.value })}
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      {composition.title.length}/100 characters
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={composition.category}
                      onValueChange={(value) => updateComposition({ category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="body">Message Body</Label>
                  <Textarea
                    id="body"
                    placeholder="Enter your notification message"
                    value={composition.body}
                    onChange={(e) => updateComposition({ body: e.target.value })}
                    maxLength={500}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {composition.body.length}/500 characters
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={composition.priority}
                      onValueChange={(value: 'low' | 'normal' | 'high') => updateComposition({ priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="url">Action URL (Optional)</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com/action"
                      value={composition.url || ''}
                      onChange={(e) => updateComposition({ url: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Target Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <Label className="text-base font-medium">Target Audience</Label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="target-all"
                      name="target"
                      checked={composition.target.type === 'all'}
                      onChange={() => updateTarget({ type: 'all' })}
                    />
                    <Label htmlFor="target-all" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      All Users ({users.filter(u => u.hasNotifications).length})
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="target-individual"
                      name="target"
                      checked={composition.target.type === 'individual'}
                      onChange={() => updateTarget({ type: 'individual' })}
                    />
                    <Label htmlFor="target-individual" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Specific Users
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="target-group"
                      name="target"
                      checked={composition.target.type === 'group'}
                      onChange={() => updateTarget({ type: 'group' })}
                    />
                    <Label htmlFor="target-group" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      User Groups ({groups.length})
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="target-location"
                      name="target"
                      checked={composition.target.type === 'location'}
                      onChange={() => updateTarget({ type: 'location' })}
                    />
                    <Label htmlFor="target-location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location-based
                    </Label>
                  </div>
                </div>
                
                {composition.target.type === 'individual' && (
                  <div className="ml-6 space-y-2">
                    <Label>Select Users</Label>
                    {loadingUsers ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading users...</span>
                      </div>
                    ) : (
                      <>
                        <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                          {users.filter(u => u.hasNotifications).map((user) => (
                            <div key={user.id} className="flex items-center space-x-2 py-1">
                              <input
                                type="checkbox"
                                id={user.id}
                                checked={selectedUsers.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSelected = [...selectedUsers, user.id];
                                    setSelectedUsers(newSelected);
                                    updateTarget({ userIds: newSelected });
                                  } else {
                                    const newSelected = selectedUsers.filter(id => id !== user.id);
                                    setSelectedUsers(newSelected);
                                    updateTarget({ userIds: newSelected });
                                  }
                                }}
                              />
                              <Label htmlFor={user.id} className="text-sm flex items-center space-x-2">
                                <span>{user.displayName || user.email}</span>
                                <span className="text-xs text-muted-foreground">({user.email})</span>
                                {user.lastActive && (
                                  <span className="text-xs text-green-600">Active</span>
                                )}
                              </Label>
                            </div>
                          ))}
                          {users.filter(u => u.hasNotifications).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              No users with notification permissions found
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedUsers.length} user(s) selected
                        </p>
                      </>
                    )}
                  </div>
                )}
                
                {composition.target.type === 'group' && (
                  <div className="ml-6 space-y-2">
                    <Label>Select User Group</Label>
                    {loadingUsers ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading groups...</span>
                      </div>
                    ) : (
                      <Select onValueChange={(value) => updateTarget({ groupId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name} ({group.userIds.length} users)
                            </SelectItem>
                          ))}
                          {groups.length === 0 && (
                            <SelectItem value="none" disabled>
                              No user groups available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {groups.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Create user groups in the user management section to use group targeting.
                      </p>
                    )}
                  </div>
                )}
                
                {composition.target.type === 'location' && (
                  <div className="ml-6 space-y-2">
                    <Label>Location Settings</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Latitude"
                        type="number"
                        step="any"
                        value={composition.target.location?.lat || ''}
                        onChange={(e) => updateTarget({
                          location: {
                            ...composition.target.location,
                            lat: parseFloat(e.target.value) || 0,
                            lng: composition.target.location?.lng || 0,
                            radius: composition.target.location?.radius || 10
                          }
                        })}
                      />
                      <Input
                        placeholder="Longitude"
                        type="number"
                        step="any"
                        value={composition.target.location?.lng || ''}
                        onChange={(e) => updateTarget({
                          location: {
                            ...composition.target.location,
                            lat: composition.target.location?.lat || 0,
                            lng: parseFloat(e.target.value) || 0,
                            radius: composition.target.location?.radius || 10
                          }
                        })}
                      />
                      <Input
                        placeholder="Radius (km)"
                        type="number"
                        min="1"
                        value={composition.target.location?.radius || ''}
                        onChange={(e) => updateTarget({
                          location: {
                            ...composition.target.location,
                            lat: composition.target.location?.lat || 0,
                            lng: composition.target.location?.lng || 0,
                            radius: parseInt(e.target.value) || 10
                          }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Scheduling */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Label className="text-base font-medium">Delivery Schedule</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="immediate"
                    checked={composition.schedule.immediate}
                    onCheckedChange={(checked) => updateSchedule({ immediate: checked })}
                  />
                  <Label htmlFor="immediate">Send immediately</Label>
                </div>
                
                {!composition.schedule.immediate && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Scheduled Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date);
                                if (date) {
                                  updateComposition({
                                    schedule: {
                                      ...composition.schedule,
                                      scheduledDate: date
                                    }
                                  });
                                }
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="time">Scheduled Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => {
                            setSelectedTime(e.target.value);
                            updateComposition({
                              schedule: {
                                ...composition.schedule,
                                scheduledTime: e.target.value
                              }
                            });
                          }}
                          min={selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 
                            format(new Date(), 'HH:mm') : undefined}
                        />
                      </div>
                    </div>
                    
                    {selectedDate && selectedTime && (
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                          <Clock className="inline h-4 w-4 mr-1" />
                          Scheduled for: {format(selectedDate, "PPP")} at {selectedTime}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {(() => {
                            const scheduledDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);
                            const now = new Date();
                            const diffMs = scheduledDateTime.getTime() - now.getTime();
                            const diffHours = Math.round(diffMs / (1000 * 60 * 60));
                            
                            if (diffHours < 1) {
                              const diffMinutes = Math.round(diffMs / (1000 * 60));
                              return `In ${diffMinutes} minute(s)`;
                            } else if (diffHours < 24) {
                              return `In ${diffHours} hour(s)`;
                            } else {
                              const diffDays = Math.round(diffHours / 24);
                              return `In ${diffDays} day(s)`;
                            }
                          })()} 
                        </p>
                      </div>
                    )}
                    
                    {selectedDate && selectedTime && (() => {
                      const scheduledDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);
                      const now = new Date();
                      return scheduledDateTime <= now;
                    })() && (
                      <div className="p-3 bg-red-50 rounded-md">
                        <p className="text-sm text-red-800">
                          <AlertTriangle className="inline h-4 w-4 mr-1" />
                          Warning: Scheduled time is in the past. Please select a future date and time.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Preview and Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="preview"
                      checked={previewMode}
                      onCheckedChange={setPreviewMode}
                    />
                    <Label htmlFor="preview">Preview notification</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setComposition({
                          title: '',
                          body: '',
                          category: 'system',
                          target: { type: 'all' },
                          schedule: { immediate: true },
                          priority: 'normal'
                        });
                        setSelectedDate(undefined);
                        setSelectedTime('');
                      }}
                    >
                      Clear
                    </Button>
                    
                    <Button
                      onClick={sendNotification}
                      disabled={isSending || !composition.title || !composition.body}
                    >
                      {isSending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {composition.schedule.immediate ? 'Send Now' : 'Schedule'}
                    </Button>
                  </div>
                </div>
                
                {previewMode && composition.title && composition.body && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Bell className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{composition.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{composition.body}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {notificationCategories.find(c => c.id === composition.category)?.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {composition.priority} priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              {/* Delivery History */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Notification History</h3>
                  <p className="text-sm text-muted-foreground">
                    Track the status and delivery metrics of sent notifications.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sending">Sending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadDeliveryHistory} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <History className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading delivery history...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDeliveries.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{deliveries.length === 0 ? 'No notifications sent yet' : 'No notifications match the current filter'}</p>
                    </div>
                  ) : (
                    filteredDeliveries.map((delivery) => (
                      <Card key={delivery.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{delivery.composition.title}</h4>
                              <Badge variant={getStatusVariant(delivery.status)}>
                                {delivery.status}
                              </Badge>
                              {delivery.composition.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs">
                                  High Priority
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {delivery.composition.body}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                                {delivery.composition.category}
                              </span>
                              <span>Target: {getTargetDescription(delivery.composition.target)}</span>
                              {delivery.scheduledFor && (
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Scheduled: {format(new Date(delivery.scheduledFor), 'MMM d, HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right space-y-2 ml-4">
                            {delivery.sentAt && (
                              <div className="text-sm text-muted-foreground">
                                Sent: {format(new Date(delivery.sentAt), 'MMM d, HH:mm')}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-end space-x-3">
                              {delivery.status === 'sent' && (
                                <>
                                  <div className="flex items-center text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    <span className="font-medium">{delivery.deliveredCount || 0}</span>
                                  </div>
                                  {delivery.failedCount > 0 && (
                                    <div className="flex items-center text-red-600">
                                      <XCircle className="h-4 w-4 mr-1" />
                                      <span className="font-medium">{delivery.failedCount}</span>
                                    </div>
                                  )}
                                  <div className="text-muted-foreground text-sm">
                                    / {delivery.targetCount || 0}
                                  </div>
                                </>
                              )}
                              
                              {delivery.status === 'sending' && (
                                <div className="flex items-center text-blue-600">
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  <span className="text-sm">Sending...</span>
                                </div>
                              )}
                              
                              {delivery.status === 'pending' && (
                                <div className="flex items-center text-yellow-600">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span className="text-sm">Scheduled</span>
                                </div>
                              )}
                              
                              {delivery.status === 'failed' && (
                                <div className="flex items-center text-red-600">
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  <span className="text-sm">Failed</span>
                                </div>
                              )}
                            </div>
                            
                            {delivery.status === 'sent' && delivery.targetCount > 0 && (
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ 
                                    width: `${Math.round((delivery.deliveredCount / delivery.targetCount) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => viewNotificationDetails(delivery.id)}
                              >
                                View Details
                              </Button>
                              {(delivery.status === 'sent' || delivery.status === 'failed') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => deleteNotification(delivery.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}