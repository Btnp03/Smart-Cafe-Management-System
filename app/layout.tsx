import { AuthProvider } from "./context/AuthContext";
import RootShell from "./_components/root-shell";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RootShell>{children}</RootShell>
        </AuthProvider>
      </body>
    </html>
  );
}
