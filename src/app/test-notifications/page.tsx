import { NotificationTestPanel } from '@/components/notification-test-panel';
import { PushNotificationProvider } from '@/context/push-notification-provider';

export default function TestNotificationsPage() {
  return (
    <PushNotificationProvider>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Push Notification Testing</h1>
          <p className="text-muted-foreground">
            Test and verify push notification functionality for MapKH mobile app
          </p>
        </div>
        
        <NotificationTestPanel />
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Testing Instructions</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Permission Test:</strong> Verifies notification permission status</p>
            <p>• <strong>Service Worker Test:</strong> Checks if service worker is properly registered</p>
            <p>• <strong>Badge Test:</strong> Tests badge count management functionality</p>
            <p>• <strong>Silent Test:</strong> Tests silent notification processing</p>
            <p>• <strong>Sync Test:</strong> Tests background synchronization</p>
            <p>• <strong>Local Test:</strong> Tests local notification display</p>
          </div>
          
          <div className="mt-4 p-3 bg-background rounded border">
            <h3 className="font-medium mb-2">Testing Scenarios:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>1. Test with app in foreground (current tab active)</li>
              <li>2. Test with app in background (switch to another tab)</li>
              <li>3. Test with app closed (close browser tab/window)</li>
              <li>4. Test on mobile device (if available)</li>
              <li>5. Test with network offline/online transitions</li>
            </ul>
          </div>
        </div>
      </div>
    </PushNotificationProvider>
  );
}