"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { fetchProgress, setLessonDone } from "../lib/api";

// Leçons terminées du compte connecté (vide sans compte).
export function useProgress() {
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return setDone(new Set());
    fetchProgress()
      .then((rows) => setDone(new Set(rows.map((r) => r.lessonId))))
      .catch(() => {});
  }, [user]);

  const mark = useCallback(async (courseId: string, lessonId: string, value: boolean) => {
    await setLessonDone(courseId, lessonId, value);
    setDone((prev) => {
      const next = new Set(prev);
      if (value) next.add(lessonId);
      else next.delete(lessonId);
      return next;
    });
  }, []);

  return { signedIn: !!user, done, mark };
}
