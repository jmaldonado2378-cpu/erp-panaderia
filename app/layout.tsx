import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-900 m-0 p-0 overflow-hidden">{children}</body>
    </html>
  );
}
