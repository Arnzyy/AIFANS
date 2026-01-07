import { redirect } from 'next/navigation';

// Profile route is deprecated - redirect to hybrid dashboard
export default function ProfilePage() {
  redirect('/dashboard');
}
