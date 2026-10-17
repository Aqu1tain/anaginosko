// Permissions granulaires (miroir de l'API app/abilities/permissions.ts). Chaque
// capacité remplace un ancien gate par rôle. Module pur, partagé client/serveur.

export const PERMISSIONS = [
  "dashboard",
  "annotations",
  "moderate",
  "arbitrage",
  "ai",
  "articles",
  "review",
  "publish",
  "reports",
  "accounts",
  "courses",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<Permission, string> = {
  dashboard: "Tableau de bord",
  annotations: "Annotations",
  moderate: "Modération",
  arbitrage: "Arbitrage LXX",
  ai: "Assistant IA",
  articles: "Rédaction d’articles",
  review: "Relecture d’articles",
  publish: "Publication d’articles",
  reports: "Signalements",
  accounts: "Comptes",
  courses: "Cours",
};

export const PERMISSION_HINT: Record<Permission, string> = {
  dashboard: "Statistiques, analytics, liste de ses annotations",
  annotations: "Écrire et éditer ses annotations et prononciations",
  moderate: "Éditer les annotations d'autrui, tout voir",
  arbitrage: "Arbitrage LXX (liens grec / Giguet)",
  ai: "IAnaginosko et assistant de traduction (bêta, clé personnelle)",
  articles: "Rédiger et éditer ses articles",
  review: "Relire et approuver les articles d'un autre auteur",
  publish: "Publier une version approuvée, dépublier et archiver",
  reports: "Traiter les signalements des lecteurs",
  accounts: "Gérer les comptes, titres et permissions",
  courses: "Modifier les cours : structure, leçons, publication",
};

// Regroupement pour l'affichage (fiche d'un compte, édition d'un rôle).
export const PERMISSION_GROUPS: { title: string; permissions: Permission[] }[] = [
  { title: "Articles et cours", permissions: ["articles", "review", "publish", "courses"] },
  { title: "Texte biblique", permissions: ["annotations", "moderate", "arbitrage", "ai"] },
  { title: "Administration", permissions: ["dashboard", "reports", "accounts"] },
];

// Couleur stable d'un rôle, d'après son identifiant.
const ROLE_COLORS = ["#5865f2", "#3ba55d", "#faa61a", "#ed4245", "#eb459e", "#1abc9c", "#9b59b6", "#e67e22"];
export const roleColor = (id: number) => ROLE_COLORS[(id - 1) % ROLE_COLORS.length];

// Préréglages : remplissent un titre + un jeu de permissions, ajustables ensuite.
export type Preset = { title: string; permissions: Permission[] };

export const PRESETS: Preset[] = [
  { title: "Administrateur", permissions: [...PERMISSIONS] },
  { title: "Philologue", permissions: ["dashboard", "annotations", "arbitrage", "articles", "reports"] },
  { title: "Relecteur", permissions: ["dashboard", "articles", "review", "reports"] },
  { title: "Lecteur", permissions: ["dashboard"] },
];
