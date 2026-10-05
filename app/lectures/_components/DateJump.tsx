"use client";

import { useRouter } from "next/navigation";

export default function DateJump({ base, value, min, max }: { base: string; value: string; min?: string; max?: string }) {
  const router = useRouter();
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      Aller à une date
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = e.target.value;
          if (!next || (min && next < min) || (max && next > max)) return;
          router.push(`${base}/${next}`);
        }}
        className="input input-bordered h-11 rounded-xl bg-base-100 font-normal"
      />
    </label>
  );
}
