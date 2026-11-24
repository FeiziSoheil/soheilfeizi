import PortfolioShell from '@/components/PortfolioShell';

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = searchParams ? await searchParams : {};
  const v = typeof sp.v === 'string' ? sp.v : undefined;
  const debug = typeof sp.debug === 'string' ? sp.debug : undefined;
  const initialGatewayDone = v === 'site' || debug === 'shapes';

  return <PortfolioShell initialGatewayDone={initialGatewayDone} />;
}
