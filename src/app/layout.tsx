import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s - Faculty Allocation System",
    default: "Faculty Allocation System",
  },
  description: "Manage faculty office assignments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Switzer is the typeface used by the Radiant template. */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/css?f%5B%5D=switzer@400,500,600,700&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col text-gray-950 antialiased">
        {children}
      </body>
    </html>
  );
}
