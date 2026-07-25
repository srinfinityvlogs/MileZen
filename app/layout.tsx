export const metadata = {
  title: 'MileZen',
  description: 'The operating system for your cards, points, and miles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
