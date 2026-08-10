import { instructions } from '@/lib/instructions-data';
import KbClient from './KbClient';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function KbPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const tabParam = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'ga4';
  
  // Validate tab parameter, fallback to 'ga4'
  const validTabs = instructions.map(inst => inst.id);
  const initialTab = validTabs.includes(tabParam) ? tabParam : 'ga4';

  return <KbClient initialTab={initialTab} />;
}
