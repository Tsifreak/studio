
import type { ReactNode } from 'react';
// If you have a specific dashboard navbar or sidebar, import it here.
// For now, it will use the main AppWrapper layout.

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {/* 
        If you had a dashboard-specific sidebar, it would go here.
        Example:
        <div className="flex">
          <DashboardSidebar />
          <div className="flex-grow p-6">
            {children}
          </div>
        </div>
      */}
      {children}
    </div>
  );
}
