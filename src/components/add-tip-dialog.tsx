"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Pencil } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { Tip, TipIcon, tipIcons } from '@/lib/types';
import { addTip, updateTip } from '@/app/actions';
import { useTranslation } from 'react-i18next';

const addTipSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  content: z.string().min(10, "Content must be at least 10 characters long."),
  icon: z.string().refine((val) => Object.keys(tipIcons).includes(val), {
    message: "Please select a valid icon.",
  }),
});

type AddTipFormValues = z.infer<typeof addTipSchema>;

export function AddTipDialog({ tip, onTipSaved, children }: { tip?: Tip, onTipSaved: () => void, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isEditMode = !!tip;

  const form = useForm<AddTipFormValues>({
    resolver: zodResolver(addTipSchema),
    defaultValues: isEditMode ? { title: tip.title, content: tip.content, icon: tip.icon } : {
      title: '',
      content: '',
      icon: 'Info',
    },
  });

  const { isSubmitting } = form.formState;

  const handleFormSubmit = async (values: AddTipFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: t('contributions.tips.auth_error')});
        return;
    }

    const result = isEditMode
        ? await updateTip(tip.id, values, user.uid)
        : await addTip(values, user.uid, user.displayName, user.email);

    if (result.success) {
      toast({ title: isEditMode ? t('contributions.tips.update_success') : t('contributions.tips.add_success') });
      setIsOpen(false);
      form.reset();
      onTipSaved();
    } else if (result.errors) {
      Object.keys(result.errors).forEach((key) => {
          const fieldName = key as keyof AddTipFormValues;
          const message = result.errors[fieldName]?.[0];
          if (message) {
            form.setError(fieldName, { type: 'server', message });
          }
      });
    } else {
        toast({ variant: 'destructive', title: t('contributions.tips.add_fail_title'), description: result.error });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
            form.reset(isEditMode ? { title: tip.title, content: tip.content, icon: tip.icon } : { title: '', content: '', icon: 'Info' });
        }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('contributions.tips.edit_dialog_title') : t('contributions.tips.dialog_title')}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t('contributions.tips.edit_dialog_description') : t('contributions.tips.dialog_description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contributions.tips.form.title_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('contributions.tips.form.title_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contributions.tips.form.content_label')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('contributions.tips.form.content_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contributions.tips.form.icon_label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('contributions.tips.form.icon_placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(tipIcons).map((iconName) => {
                          const IconComponent = tipIcons[iconName as TipIcon];
                          return (
                            <SelectItem key={iconName} value={iconName}>
                                <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    <span>{iconName}</span>
                                </div>
                            </SelectItem>
                          )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                {t('records.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditMode ? t('contributions.tips.form.update_button') : t('contributions.tips.form.submit_button')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
