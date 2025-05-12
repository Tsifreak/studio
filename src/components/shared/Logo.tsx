
import Link from 'next/link';
import { ShoppingBasket } from 'lucide-react'; // Using ShoppingBasket as a generic store icon

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <ShoppingBasket className="text-primary" size={iconSize} aria-hidden="true" />
      <span className={`font-bold ${textSize} text-primary`}>StoreSpot</span>
    </Link>
  );
}
