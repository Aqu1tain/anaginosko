// Exercice de leçon : QCM à une bonne réponse, ou question ouverte à réponse cachée
// (pas d'options). Stocké en props scalaires BlockNote, édité sous forme de texte :
//
//   Question ?
//   + bonne réponse
//   - mauvaise réponse
//   = explication
export type Exercise = { question: string; options: string[]; answer: number; explanation: string };

export type ExerciseProps = { question: string; options: string; answer: number; explanation: string };

export const exerciseFromProps = (p: Partial<ExerciseProps>): Exercise => ({
  question: String(p.question ?? ""),
  options: String(p.options ?? "").split("\n").filter(Boolean),
  answer: Number(p.answer ?? -1),
  explanation: String(p.explanation ?? ""),
});

export const exerciseToProps = (e: Exercise): ExerciseProps => ({
  question: e.question,
  options: e.options.join("\n"),
  answer: e.answer,
  explanation: e.explanation,
});

export function parseExercise(text: string): Exercise {
  const e: Exercise = { question: "", options: [], answer: -1, explanation: "" };
  const question: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const m = line.match(/^([+\-=])\s*(.*)$/);
    if (!m) {
      if (line) question.push(line);
      continue;
    }
    if (m[1] === "=") e.explanation = [e.explanation, m[2]].filter(Boolean).join(" ");
    else {
      if (m[1] === "+") e.answer = e.options.length;
      e.options.push(m[2]);
    }
  }
  e.question = question.join(" ");
  return e;
}

export const exerciseText = (e: Exercise): string =>
  [
    e.question,
    ...e.options.map((o, i) => `${i === e.answer ? "+" : "-"} ${o}`),
    ...(e.explanation ? [`= ${e.explanation}`] : []),
  ].join("\n");

// Ordre d'affichage stable (identique serveur et client) pour que la bonne réponse
// ne soit pas toujours la première.
export function displayOrder(e: Exercise): number[] {
  let h = 0;
  for (const c of e.question) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const order = e.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
