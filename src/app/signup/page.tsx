
import { SignupForm } from '@/components/auth/SignupForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Εγγραφή | Amaxakis',
  description: 'Δημιουργήστε έναν νέο λογαριασμό Amaxakis.',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,15rem)-1px)] flex-col items-center justify-center py-12">
      <SignupForm />
    </div>
  );
}

