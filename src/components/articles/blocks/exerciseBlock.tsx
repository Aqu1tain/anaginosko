"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import ExerciseView from "../ExerciseView";
import { exerciseFromProps, exerciseText, exerciseToProps, parseExercise, type ExerciseProps } from "@/src/lib/exercise";

export const exerciseBlock = createReactBlockSpec(
  {
    type: "exercise",
    propSchema: {
      question: { default: "" },
      options: { default: "" },
      answer: { default: -1 },
      explanation: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <ExerciseBlockView
        props={block.props as ExerciseProps}
        editable={editor.isEditable}
        onSet={(props) => editor.updateBlock(block, { props })}
      />
    ),
  },
);

function ExerciseBlockView({ props, editable, onSet }: { props: ExerciseProps; editable: boolean; onSet: (p: ExerciseProps) => void }) {
  const exercise = exerciseFromProps(props);
  const [draft, setDraft] = useState(() => exerciseText(exercise));
  if (!editable) return <div contentEditable={false}><ExerciseView exercise={exercise} /></div>;

  return (
    <div contentEditable={false} className="my-1 w-full rounded-box border border-dashed border-base-300 p-4">
      <p className="text-sm font-medium">Exercice</p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSet(exerciseToProps(parseExercise(draft)))}
        rows={Math.max(4, draft.split("\n").length + 1)}
        placeholder={"Quelle lettre se lit « ph » ?\n+ φ\n- ψ\n- θ\n= Le phi a donné le « ph » de philosophie."}
        className="textarea textarea-bordered mt-2 w-full font-mono text-sm"
      />
      <p className="mt-1 text-xs text-base-content/50">
        1re ligne : la question. « + » bonne réponse, « - » mauvaise, « = » explication. Sans options : réponse cachée.
      </p>
      <ExerciseView key={exerciseText(exercise)} exercise={exercise} />
    </div>
  );
}
