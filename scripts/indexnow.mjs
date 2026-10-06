// Signale des URL à IndexNow (Bing, Yandex, Seznam, Naver…). Bing alimente aussi la
// recherche de ChatGPT et de Copilot. La clé est publique par conception : elle est
// servie à la racine du site (public/<clé>.txt) pour prouver la propriété.
//
//   node scripts/indexnow.mjs                     (tout le sitemap)
//   node scripts/indexnow.mjs /nt/jn/1 /a-propos  (quelques pages)

const HOST = "anaginosko.fr";
const KEY = "96d2cf9263b817372d4a50142006b3d5";
const BATCH = 10000;

const fromSitemap = async () => {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
};

const args = process.argv.slice(2);
const urls = args.length ? args.map((p) => `https://${HOST}${p.startsWith("/") ? p : `/${p}`}`) : await fromSitemap();

for (let i = 0; i < urls.length; i += BATCH) {
  const urlList = urls.slice(i, i + BATCH);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  });
  console.log(`${urlList.length} URL : HTTP ${res.status}`);
}
