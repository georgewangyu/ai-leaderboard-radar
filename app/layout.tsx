import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://aileaderboardradar.snackoverflowgeorge.com"),
  title: "AI Leaderboard Radar",
  description:
    "A searchable radar for lean AI-native companies, revenue per employee, source receipts, and weekly leaderboard updates.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI Leaderboard Radar",
    description:
      "A searchable radar for lean AI-native companies, revenue per employee, source receipts, and weekly leaderboard updates.",
    url: "https://aileaderboardradar.snackoverflowgeorge.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
