import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Mock user - in real app, fetch from auth
const MOCK_USER = {
  id: '1',
  name: 'Billy Arnold',
  username: 'u543889685',
  isCreator: true,
  isVerifiedCreator: true,
};

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout user={MOCK_USER}>{children}</DashboardLayout>;
}
