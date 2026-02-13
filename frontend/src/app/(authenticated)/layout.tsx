import { AuthGuard } from '@/components/auth-guard';
import { NavShell } from '@/components/nav-shell';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <NavShell>{children}</NavShell>
    </AuthGuard>
  );
}
