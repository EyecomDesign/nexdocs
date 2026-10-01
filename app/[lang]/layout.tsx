import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import "../globals.css";

const LOCALES = new Set(["en"]);

export const metadata: Metadata = {
  title: "NexDocs",
  description: "Official documentation for the Nexor bot",
  robots: { index: false, follow: false },
};

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // [lang] is a dynamic segment that matches any value at runtime. Bail out
  // early for anything that isn't a real locale — otherwise getPageMap() throws
  // and turns a should-be-404 (e.g. /gitbook-assets/missing.png, /random-page)
  // into a 500.
  if (!LOCALES.has(lang)) notFound();
  const pageMap = await getPageMap(`/${lang}`);

  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/EyecomDesign/nexdocs/tree/main"
          navbar={
            <Navbar
              logo={
                <Image
                  src="/gitbook-assets/Nexor_Logo_White.svg"
                  alt="Nexor"
                  width={116}
                  height={40}
                  className="h-8 w-auto rounded bg-slate-950 px-2 py-1"
                />
              }
              projectLink="https://github.com/EyecomDesign/nexdocs"
            />
          }
          footer={<Footer>MIT {new Date().getFullYear()} © Nexor</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
