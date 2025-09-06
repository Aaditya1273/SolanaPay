import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { WalletProvider } from "@/contexts/WalletContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SolanaFlow - Cross-Chain RWA Marketplace",
  description: "The world's first production-ready cross-chain marketplace for Real World Assets. Tokenize, trade, and fractionalize any asset with institutional-grade security.",
  keywords: "RWA, Real World Assets, Cross-chain, OneChain, SUI, NFT, DeFi, Tokenization, Marketplace",
  authors: [{ name: "SolanaFlow Team" }],
  openGraph: {
    title: "SolanaFlow - Cross-Chain RWA Marketplace",
    description: "Trade real-world assets across multiple blockchains with institutional-grade security",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <Providers>{children}</Providers>
        </WalletProvider>
      </body>
    </html>
  );
}
