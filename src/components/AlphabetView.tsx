"use client";

import {
  letters,
  diphthongs,
  spirits,
  accents,
  punctuation,
  type Letter,
} from "../data/alphabet";
import type { GraphemeInfo } from "../lib/greek";
import { useSheet } from "./SheetContext";

const asInfo = (letter: Letter): GraphemeInfo => ({
  cluster: letter.lower,
  letter,
  isFinalSigma: false,
  breathing: null,
  accent: null,
  iotaSubscript: false,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-7">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ greek, eras, rest }: { greek: string; eras: string; rest: string }) {
  return (
    <div className="flex items-center gap-3 rounded-box bg-base-200 px-3.5 py-2.5">
      <span className="font-greek w-16 shrink-0 text-xl">{greek}</span>
      <span className="flex-1 text-sm">
        <span className="text-base-content/70">éras. </span>
        {eras}
      </span>
      <span className="flex-1 text-sm">
        <span className="text-base-content/70">rest. </span>
        {rest}
      </span>
    </div>
  );
}

function DiacriticCard({ example, name, text }: { example: string; name: string; text: string }) {
  return (
    <div className="rounded-box bg-base-200 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="font-greek text-xl text-accent">{example}</span>
        <span className="font-semibold">{name}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-base-content/70">{text}</p>
    </div>
  );
}

export default function AlphabetView() {
  const { openLetter } = useSheet();

  return (
    <div className="pb-4">
      <p className="max-w-prose pt-6 text-[0.95rem] leading-relaxed text-base-content/70">
        Les 24 lettres du grec koinè. Touchez une lettre pour son nom, sa valeur
        et sa prononciation.
      </p>

      <Section title="Les lettres">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {letters.map((letter) => (
            <button
              key={letter.name}
              onClick={() => openLetter(asInfo(letter))}
              className="card border border-base-300 bg-base-100 py-3 transition-colors hover:border-primary/40 hover:bg-base-200"
            >
              <span className="font-greek text-2xl">
                {letter.upper} {letter.lower}
                {letter.final ? ` ${letter.final}` : ""}
              </span>
              <span className="mt-0.5 text-xs text-base-content/70">{letter.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Diphtongues">
        <div className="grid gap-2">
          {diphthongs.map((d) => (
            <Row key={d.greek} greek={d.greek} eras={d.erasmien} rest={d.restituee} />
          ))}
        </div>
      </Section>

      <Section title="Esprits">
        <div className="grid gap-2">
          {spirits.map((s) => (
            <DiacriticCard key={s.name} example={s.example} name={s.name} text={s.description} />
          ))}
        </div>
      </Section>

      <Section title="Accents">
        <div className="grid gap-2">
          {accents.map((a) => (
            <DiacriticCard key={a.name} example={a.example} name={a.name} text={a.description} />
          ))}
        </div>
      </Section>

      <Section title="Ponctuation">
        <div className="grid gap-2">
          {punctuation.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-3 rounded-box bg-base-200 px-3.5 py-2.5"
            >
              <span className="font-greek w-8 shrink-0 text-center text-xl">{p.sign}</span>
              <div className="text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-base-content/70"> · {p.meaning}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
