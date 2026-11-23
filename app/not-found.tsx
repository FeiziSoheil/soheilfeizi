import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center font-mono">
      <h2 className="text-2xl font-bold">404 — Page Not Found</h2>
      <Link href="/" className="mt-4 text-[#5B5BF0] underline">
        Return Home
      </Link>
    </div>
  );
}
