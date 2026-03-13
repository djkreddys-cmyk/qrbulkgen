import "./globals.css";

export const metadata = {
  title: "QRBulkGen",
  description: "Bulk QR Code Generator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}