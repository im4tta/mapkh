import { AdminForceUpdate } from '@/components/admin-force-update';

export default function AdminForceUpdatePage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin: Force Update Management</h1>
        <p className="text-muted-foreground">
          Manage cache cleanup and force updates for all PWA users.
        </p>
      </div>
      
      <AdminForceUpdate />
    </div>
  );
}