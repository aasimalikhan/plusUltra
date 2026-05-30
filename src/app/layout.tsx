import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "plusUltra",
  description: "Slave to the logical brain.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
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
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className="font-sans">
      <body className="font-sans antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
          {user && <TopNav email={user.email ?? null} />}
          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
