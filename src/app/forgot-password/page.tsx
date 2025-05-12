
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ξέχασα τον Κωδικό | Amaxakis',
  description: 'Επαναφέρετε τον κωδικό πρόσβασης του λογαριασμού σας Amaxakis.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,15rem)-1px)] flex-col items-center justify-center py-12">
      <ForgotPasswordForm />
    </div>
  );
}

