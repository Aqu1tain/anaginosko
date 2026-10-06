import { NextResponse, type NextRequest } from "next/server";

// Un agent qui préfère le Markdown (en-tête Accept) reçoit, sur l'URL même du
// chapitre ou de la fiche, la version Markdown plutôt que la page interactive.
const prefersMarkdown = (accept: string | null): boolean => {
  if (!accept) return false;
  const md = accept.indexOf("text/markdown");
  const html = accept.indexOf("text/html");
  return md !== -1 && (html === -1 || md < html);
};

const markdownPath = (pathname: string): string | null => {
  if (pathname.endsWith(".md")) return null;
  const chapter = pathname.match(/^\/(nt|lxx)\/([^/]+)\/(\d+)$/);
  if (chapter) return `/markdown/chapitre/${chapter[1]}/${chapter[2]}/${chapter[3]}`;
  const lemma = pathname.match(/^(\/lxx)?\/concordance\/([^/]+)$/);
  if (lemma) return `/markdown/lemme/${lemma[1] ? "lxx" : "nt"}/${lemma[2]}`;
  return null;
};

// www sert aujourd'hui la même page en 200 (contenu dupliqué indexé par Google).
// Défense en profondeur côté app : 301 vers l'apex. Le vrai correctif est aussi
// dans nginx (server_name www -> return 301), mais ce middleware couvre tout
// chemin de service direct.
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = "https";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }
  const target = prefersMarkdown(req.headers.get("accept")) ? markdownPath(req.nextUrl.pathname) : null;
  if (target) return NextResponse.rewrite(new URL(target, req.url));
  return NextResponse.next();
}

export const config = {
  // Tout sauf les assets statiques et les données servies par nginx, plus les
  // chapitres et fiches de la Septante pour la version Markdown.
  matcher: [
    "/((?!_next/|audio/|nt/|lxx/|favicon|.*\\.(?:png|jpg|svg|ico|mp3|json)).*)",
    "/nt/:book/:chapter",
    "/lxx/:book/:chapter",
    "/lxx/concordance/:lemma",
  ],
};
