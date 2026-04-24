import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shift Buddy",
  description: "House Officer clinical decision support — Phase 0",
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
