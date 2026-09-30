import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RouteForge — shortest delivery run from your storage house",
  description:
    "Upload your stops, get the shortest driving order, and see exactly how much it saves against the order you started with.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Applies the stored theme before first paint so the page never flashes.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rf-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${interTight.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
