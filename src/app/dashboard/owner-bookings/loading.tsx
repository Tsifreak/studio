
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function OwnerBookingsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" /> {/* Back button */}
          <Skeleton className="h-8 w-72" /> {/* Page Title */}
        </div>
        <Skeleton className="h-10 w-32" /> {/* Refresh Button */}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/2 mb-1" /> {/* Card Title */}
          <Skeleton className="h-4 w-3/4" /> {/* Card Description */}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Table Skeleton */}
          <div className="space-y-1">
            {/* Header Row */}
            <div className="flex items-center justify-between p-2 border-b">
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/5" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/12" />
            </div>
            {/* Data Rows */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b">
                <Skeleton className="h-5 w-1/6" />
                <Skeleton className="h-5 w-1/6" />
                <Skeleton className="h-5 w-1/5" />
                <Skeleton className="h-5 w-1/6" />
                <Skeleton className="h-5 w-1/6" />
                <div className="flex gap-2 w-1/12 justify-end">
                    <Skeleton className="h-7 w-7 rounded-sm" />
                    <Skeleton className="h-7 w-7 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
