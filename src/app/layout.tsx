import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";
import ToastWrapper from "@/components/ToastWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeuraliticaBot - Conversa con tus documentos en segundos",
  description: "Conversa con tus documentos en segundos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            <ConfirmationProvider>
              {children}
              <ToastWrapper />
            </ConfirmationProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
