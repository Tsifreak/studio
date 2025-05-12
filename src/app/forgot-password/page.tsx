
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | Amaxakis',
  description: 'Reset your Amaxakis account password.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,15rem)-1px)] flex-col items-center justify-center py-12">
      <ForgotPasswordForm />
    </div>
  );
}

