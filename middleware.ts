import { NextResponse, type NextRequest } from "next/server";

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
  return NextResponse.next();
}

export const config = {
  // Tout sauf les assets statiques et les données servies par nginx.
  matcher: ["/((?!_next/|audio/|nt/|lxx/|favicon|.*\\.(?:png|jpg|svg|ico|mp3|json)).*)"],
};
