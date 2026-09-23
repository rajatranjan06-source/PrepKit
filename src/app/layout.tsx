import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'PrepKit - AI Interview Preparation Kit Generator',
  description: 'Turn job descriptions and company websites into personalized, structured interview preparation kits with study schedules and practice mode.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F7F7EE] text-[#232D24] min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-[#D6E0C5] py-6 text-center text-xs text-[#647A67]">
          <p>© 2026 PrepKit - Autonomous AI Interview Preparation Kit Builder</p>
        </footer>
      </body>
    </html>
  );
}
