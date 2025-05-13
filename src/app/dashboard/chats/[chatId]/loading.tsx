
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatViewLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,64px)-var(--page-padding,64px)-2px)] max-w-3xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 mb-4 p-4 border-b">
        <Skeleton className="h-10 w-10 rounded-md" /> {/* Back button */}
        <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar */}
        <Skeleton className="h-6 w-40" /> {/* Name */}
      </div>

      {/* Messages Area Skeleton */}
      <div className="flex-grow p-4 space-y-4 overflow-y-auto">
        <div className="flex justify-start">
          <Skeleton className="h-16 w-3/5 rounded-lg" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-20 w-3/4 rounded-lg bg-primary/10" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-12 w-1/2 rounded-lg" />
        </div>
         <div className="flex justify-end">
          <Skeleton className="h-16 w-2/3 rounded-lg bg-primary/10" />
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-grow rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>
    </div>
  );
}
