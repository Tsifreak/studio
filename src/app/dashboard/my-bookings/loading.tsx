
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function MyBookingsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" /> {/* Back button */}
        <Skeleton className="h-8 w-48" /> {/* Page Title */}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex space-x-1 bg-muted p-1 rounded-md h-10">
        <Skeleton className="flex-1 h-full rounded-sm" />
        <Skeleton className="flex-1 h-full rounded-sm" />
      </div>

      {/* Card for Bookings List Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" /> {/* Card Title */}
          <Skeleton className="h-4 w-2/3" /> {/* Card Description */}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table Skeleton */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 border-b">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/5" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/6" />
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 border-b">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/5" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
