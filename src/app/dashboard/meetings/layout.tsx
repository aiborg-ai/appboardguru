import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meetings | BoardGuru',
  description: 'Manage and organize your board meetings, AGMs, and committee sessions',
};

export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}