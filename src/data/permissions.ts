// Permissions granulaires (miroir de l'API app/abilities/permissions.ts). Chaque
// capacité remplace un ancien gate par rôle. Module pur, partagé client/serveur.

export const PERMISSIONS = [
  "dashboard",
  "annotations",
  "moderate",
  "arbitrage",
  "articles",
  "review",
  "reports",
  "accounts",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<Permission, string> = {
  dashboard: "Tableau de bord",
  annotations: "Annotations",
  moderate: "Modération",
  arbitrage: "Arbitrage LXX",
  articles: "Articles — rédaction",
  review: "Articles — relecture",
  reports: "Signalements",
  accounts: "Comptes",
};

export const PERMISSION_HINT: Record<Permission, string> = {
  dashboard: "Statistiques, analytics, liste de ses annotations",
  annotations: "Écrire et éditer ses annotations et prononciations",
  moderate: "Éditer les annotations d'autrui, tout voir",
  arbitrage: "Arbitrage LXX (liens grec / Giguet)",
  articles: "Rédiger et éditer ses articles",
  review: "Relire, approuver et publier les articles",
  reports: "Traiter les signalements des lecteurs",
  accounts: "Gérer les comptes, titres et permissions",
};

// Préréglages : remplissent un titre + un jeu de permissions, ajustables ensuite.
export type Preset = { title: string; permissions: Permission[] };

export const PRESETS: Preset[] = [
  { title: "Administrateur", permissions: [...PERMISSIONS] },
  { title: "Philologue", permissions: ["dashboard", "annotations", "arbitrage", "articles", "reports"] },
  { title: "Relecteur", permissions: ["dashboard", "articles", "review", "reports"] },
  { title: "Lecteur", permissions: ["dashboard"] },
];
