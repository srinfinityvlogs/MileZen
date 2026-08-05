import { Header } from './Header';

export const metadata = {
  title: 'MileZen',
  description: 'Find the best card for you, and the smartest way to redeem your miles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>
        <Header />
        {children}
      </body>
    </html>
  );
}
