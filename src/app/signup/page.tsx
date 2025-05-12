
import { SignupForm } from '@/components/auth/SignupForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | StoreSpot',
  description: 'Create a new StoreSpot account.',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,15rem)-1px)] flex-col items-center justify-center py-12">
      <SignupForm />
    </div>
  );
}
