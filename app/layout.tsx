import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuantPilot - 股市模擬交易",
  description: "模擬真實股市交易體驗，學習槓桿與風險管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        <Toaster theme="light" position="top-center" richColors />
      </body>
    </html>
  );
}
