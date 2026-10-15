// Niveaux des cours, partagés client et serveur.
export type CourseLevel = "debutant" | "intermediaire" | "avance";

export const COURSE_LEVELS: Record<CourseLevel, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};
