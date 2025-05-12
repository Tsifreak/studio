
import Link from 'next/link';
import { Wrench } from 'lucide-react'; // Changed to Wrench for car repair theme

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Wrench className="text-primary" size={iconSize} aria-hidden="true" />
      <span className={`font-bold ${textSize} text-primary`}>Amaxakis</span>
    </Link>
  );
}

