
import type { Review } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewItemProps {
  review: Review;
}

export function ReviewItem({ review }: ReviewItemProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border-b last:border-b-0">
      <Avatar className="h-12 w-12 sm:h-10 sm:w-10">
        <AvatarImage src={review.userAvatarUrl} alt={review.userName} data-ai-hint="avatar" />
        <AvatarFallback>{review.userName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
          <h4 className="font-semibold text-foreground">{review.userName}</h4>
          <div className="flex items-center mt-1 sm:mt-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`w-4 h-4 ${index < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
              />
            ))}
             <span className="ml-2 text-xs text-muted-foreground">{format(new Date(review.date), "MMM d, yyyy")}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{review.comment}</p>
      </div>
    </div>
  );
}
