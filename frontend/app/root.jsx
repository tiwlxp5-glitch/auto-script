import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { ErrorBoundary as CustomErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { ScriptGenerationProvider } from "./context/ScriptGenerationContext";
import MainLayout from "./layouts/MainLayout";
import "./index.css";

export const links = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap",
    rel: "stylesheet",
  },
];

export const meta = () => [
  { title: "Auto Script — AI เขียนสคริปต์ขายของ TikTok, Reels, ปักตะกร้า Shopee" },
  { name: "description", content: "Auto Script ใช้ AI สร้างสคริปต์วิดีโอขายของแบบมืออาชีพ ทั้ง TikTok, Reels และปักตะกร้า Shopee ด้วยสูตรจิตวิทยาการขาย PAS, HSO, FOMO และ Belief-Shifting ไม่ต้องคิดเอง พร้อมถ่ายทำทันที!" },
  { name: "keywords", content: "เขียนสคริปต์, AI เขียนสคริปต์, สคริปต์ขายของ, ปักตะกร้า Shopee, สคริปต์ TikTok, สคริปต์ Reels, คิดคอนเทนต์, Auto Script, สคริปต์รีวิวสินค้า, AI คิดคอนเทนต์" },
  { name: "robots", content: "index, follow" },
  { name: "author", content: "Auto Script" },
  { tagName: "link", rel: "canonical", href: "https://autoscript-ai.com/" },
  
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://autoscript-ai.com/" },
  { property: "og:site_name", content: "Auto Script" },
  { property: "og:title", content: "Auto Script — AI เขียนสคริปต์ขายของ TikTok, Reels, ปักตะกร้า Shopee" },
  { property: "og:description", content: "ไม่ต้องคิดสคริปต์เอง! ใส่จุดเด่นสินค้า AI จัดโครงสร้างสคริปต์พร้อมถ่ายทำให้ทันที ด้วยสูตรจิตวิทยาการขายระดับโลก PAS, HSO, FOMO และ Belief-Shifting" },
  { property: "og:image", content: "https://autoscript-ai.com/og-image.png" },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:locale", content: "th_TH" },

  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "Auto Script — AI เขียนสคริปต์ขายของ TikTok, Reels, ปักตะกร้า" },
  { name: "twitter:description", content: "ไม่ต้องคิดสคริปต์เอง! AI จัดโครงสร้างสคริปต์พร้อมถ่ายทำด้วยสูตรจิตวิทยาการขายระดับโลก" },
  { name: "twitter:image", content: "https://autoscript-ai.com/og-image.png" },
];

export function Layout({ children }) {
  return (
    <html lang="th">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body className="bg-slate-50 antialiased font-prompt text-slate-800">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <CustomErrorBoundary>
      <AuthProvider>
        <ScriptGenerationProvider>
          <MainLayout />
        </ScriptGenerationProvider>
      </AuthProvider>
    </CustomErrorBoundary>
  );
}
