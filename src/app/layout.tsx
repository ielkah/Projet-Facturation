import "./globals.css";

export const metadata = {
  title: "Facturation Agence",
  description: "Prototype de gestion de facturation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}