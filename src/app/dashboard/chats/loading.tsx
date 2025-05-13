
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

export default function ChatsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-8 w-48" />
      </div>
      
      {/* Skeleton for ChatList title/description if any */}
      <Skeleton className="h-10 w-1/3 mb-2" />
      <Skeleton className="h-5 w-2/3 mb-6" />

      {/* Skeletons for ChatItems */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-4 border rounded-lg bg-card shadow-sm flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-grow space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
