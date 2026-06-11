import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import {
  APPLE_TOUCH_ICON_SRC,
  FAVICON_16_SRC,
  FAVICON_32_SRC,
  FAVICON_ICO_SRC,
  SITE_MANIFEST_SRC,
} from '@/lib/brand-assets';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: "Tree Emporium's Modpack Planner",
  description:
    "Plan Tree Emporium's shared Minecraft modpack with live sync, category organization, and collaborative status tracking.",
  manifest: SITE_MANIFEST_SRC,
  icons: {
    icon: [
      { url: FAVICON_ICO_SRC, sizes: 'any' },
      { url: FAVICON_32_SRC, sizes: '32x32', type: 'image/png' },
      { url: FAVICON_16_SRC, sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: APPLE_TOUCH_ICON_SRC, sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
