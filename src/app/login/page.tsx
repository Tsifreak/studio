
import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Amaxakis',
  description: 'Log in to your Amaxakis account.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,15rem)-1px)] flex-col items-center justify-center py-12">
      <LoginForm />
    </div>
  );
}
