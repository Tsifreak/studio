
import type { PricingPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  plan: PricingPlan;
}

export function PricingCard({ plan }: PricingCardProps) {
  return (
    <Card className={cn("flex flex-col h-full shadow-md", plan.isFeatured && "border-primary ring-2 ring-primary")}>
      <CardHeader className="p-6">
        <CardTitle className={cn("text-2xl", plan.isFeatured && "text-primary")}>{plan.name}</CardTitle>
        <CardDescription className="text-4xl font-bold text-foreground pt-2">{plan.price}</CardDescription>
        {plan.isFeatured && <p className="text-sm text-primary font-semibold">Most Popular</p>}
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="p-6">
        <Button className={cn("w-full", plan.isFeatured ? "bg-primary hover:bg-primary/90" : "bg-accent hover:bg-accent/90 text-accent-foreground")}>
          Choose Plan
        </Button>
      </CardFooter>
    </Card>
  );
}
