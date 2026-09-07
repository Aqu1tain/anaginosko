// Le Bailly 2020 (api.bailly.app, champ htmlDefinition) est balisé uniquement
// en <span class="…"> et <div class="…"> : vedette, grec, repères de sens
// (A/B, I/II, 1/2), auteurs, références, étymologie. On le convertit en arbre
// pour le rendre en React sans injecter de HTML.

export type BaillyElement = { tag: "span" | "div"; cls: string; children: BaillyNode[] };
export type BaillyNode = string | BaillyElement;

const TAG = /<(\/?)(span|div)(?:\s+class="([^"]*)")?\s*>/g;
const OTHER_TAGS = /<(?!\/?(?:span|div)\b)[^>]*>/g;
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decode = (text: string) =>
  text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? m;
    const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  });

export function parseBaillyHtml(html: string): BaillyNode[] {
  const root: BaillyElement = { tag: "div", cls: "", children: [] };
  const stack: BaillyElement[] = [root];
  const src = html.replace(OTHER_TAGS, "");
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    const text = src.slice(last, m.index);
    if (text) stack[stack.length - 1].children.push(decode(text));
    last = m.index + m[0].length;
    if (m[1]) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const node: BaillyElement = { tag: m[2] as "span" | "div", cls: m[3] ?? "", children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  const tail = src.slice(last);
  if (tail) root.children.push(decode(tail));
  return root.children;
}
