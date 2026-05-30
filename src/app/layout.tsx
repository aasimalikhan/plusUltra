import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { getCurrentUser } from "@/lib/auth/user";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "plusUltra",
  description: "Slave to the logical brain.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "plusUltra",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col">
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-[min(28rem,50vh)] max-w-3xl bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(0_0%_100%/0.06),transparent)]"
            aria-hidden
          />
          {user && <TopNav username={user.username} />}
          <main className="relative z-10 flex-1 px-4 pb-24 pt-6 sm:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
