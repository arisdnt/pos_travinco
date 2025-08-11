export const metadata = {
  title: 'Transparansi Laporan Bahan Baku - Nilam',
  description: 'Laporan publik trend penggunaan bahan baku untuk transparansi bisnis',
  keywords: 'transparansi, laporan, bahan baku, trend, bisnis, publik',
  openGraph: {
    title: 'Transparansi Laporan Bahan Baku',
    description: 'Laporan publik trend penggunaan bahan baku untuk transparansi bisnis',
    type: 'website',
  },
};

export default function NilamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  );
}