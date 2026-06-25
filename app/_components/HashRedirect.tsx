"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Rétro-compat : les anciens liens partagés en hash (#/nt/jn/1?w=3) mappent 1:1
// vers les nouvelles URLs (/nt/jn/1?w=3). Le serveur ne voit jamais le hash,
// donc la redirection se fait au montage côté client.
export default function HashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const h = window.location.hash;
    if (h.startsWith("#/")) router.replace(h.slice(1));
  }, [router]);
  return null;
}
