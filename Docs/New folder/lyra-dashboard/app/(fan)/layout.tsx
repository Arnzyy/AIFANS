import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Mock user - in real app, fetch from auth
const MOCK_USER = {
  id: '1',
  name: 'Billy Arnold',
  username: 'u543889685',
  isCreator: true,
  isVerifiedCreator: true, // Set to false to test fan-only view
};

export default function FanLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout user={MOCK_USER}>{children}</DashboardLayout>;
}
