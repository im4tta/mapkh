
"use client";

import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { BadgesSection } from "@/components/profile/badges";
import { Badge, badges } from "@/lib/types";

const profileSchema = z.object({
  displayName: z.string().min(3, "Display name must be at least 3 characters long.").max(50, "Display name cannot be longer than 50 characters."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
    },
  });
  
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (user) {
        const fetchUserData = async () => {
          setIsLoading(true);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            form.setValue('displayName', userData.displayName || user.displayName || "");
            const earnedBadgeIds = userData.badges || [];
            const earnedBadgesData = earnedBadgeIds.map((id: keyof typeof badges) => badges[id]).filter(Boolean);
            setEarnedBadges(earnedBadgesData);
          } else {
            form.setValue('displayName', user.displayName || "");
            setEarnedBadges([]);
          }
          setIsLoading(false);
        };
        fetchUserData();
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: "Not authenticated" });
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { displayName: data.displayName }, { merge: true });
      toast({ title: "Profile updated successfully!" });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: 'destructive', title: "Failed to update profile", description: "An error occurred. Please try again." });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh_-_theme(spacing.14))]">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Update your display name.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
                            <FormField
                                control={form.control}
                                name="displayName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Enter your display name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <BadgesSection earnedBadges={earnedBadges} />
      </div>
    </div>
  );
}
