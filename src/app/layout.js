import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OrderProvider } from "@/lib/OrderContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "plate. | Your day, planned",
  description: "Pre-order your meal before the rush.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OrderProvider>{children}</OrderProvider>
      </body>
    </html>
  );
}
