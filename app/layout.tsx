import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webnett Network",
  description: "Webnett Network local prototype MVP with demo WBN wallets, mining, staking, governance, rewards, and explorer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}