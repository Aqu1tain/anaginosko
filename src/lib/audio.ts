// Prononciation via la voix française native de l'appareil (Web Speech API) :
// naturelle (neuronale sur iOS/macOS), gratuite, rien à embarquer. On lit la
// translittération érasmienne ou restituée selon le choix de l'utilisateur.
// Limite : le français ne produit pas /θ/ (θ restituée) ni /x/ (χ restituée) ;
// l'écart érasmien/restituée passe surtout par les voyelles et β, bien rendus.

let voices: SpeechSynthesisVoice[] = [];

function refresh() {
  if (typeof speechSynthesis === "undefined") return;
  voices = speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refresh();
  speechSynthesis.addEventListener?.("voiceschanged", refresh);
}

export const speechSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

function frenchVoice(): SpeechSynthesisVoice | null {
  // Préfère une voix fr-FR locale (souvent la meilleure qualité).
  return (
    voices.find((v) => v.lang === "fr-FR" && v.localService) ||
    voices.find((v) => v.lang === "fr-FR") ||
    voices.find((v) => /^fr/i.test(v.lang)) ||
    null
  );
}

// On ne donne pas le mot tel quel à la voix : on lui donne une graphie française
// trafiquée qui lui fait produire le son visé (corrige les pièges du français).
export function toFrenchSpelling(translit: string): string {
  let s = translit.toLowerCase();
  // Diphtongues érasmiennes que le français lit mal : αυ "au"→/o/, ευ "eu"→/ø/.
  s = s.replace(/au/g, "aou").replace(/eu/g, "éou");
  // g toujours dur (devant e, i, é, è…).
  s = s.replace(/g(?=[eiéèêy])/g, "gu");
  // s toujours /s/ : évite le z intervocalique (kosmos) et force la finale (logos).
  s = s.replace(/s+/g, "ss");
  // Dénasalise une voyelle suivie de n/m en fin de mot (théon, amèn…).
  // (entrée = un seul mot, donc on ancre la fin avec $ ; \b se déclenche à tort
  //  autour des lettres accentuées en JS.)
  s = s.replace(/([aeiouéèêôy])([nm])$/, "$1$2e");
  // Force la prononciation d'une consonne finale muette en français.
  s = s.replace(/([ktpdbfvr])$/, "$1e");
  return s;
}

export function speakTranslit(translit: string): void {
  if (!speechSupported()) return;
  const u = new SpeechSynthesisUtterance(toFrenchSpelling(translit));
  u.lang = "fr-FR";
  const v = frenchVoice();
  if (v) u.voice = v;
  u.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
