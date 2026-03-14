export interface Expense {
  id: string;
  date: number; // day of month (1-31)
  montantTTC: number;
  tva20: number;
  tva10: number;
  tva55: number;
  montantHT: number;
  category: ExpenseCategory;
  description: string;
  photoUrl: string | null;
  chantier: string;
  validated: boolean;
}

export type ExpenseCategory =
  | "fournisseurs"
  | "repas"
  | "peage_parking"
  | "hotel"
  | "invitations"
  | "carburant"
  | "materiel";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fournisseurs: "Fournisseurs",
  repas: "Repas",
  peage_parking: "Péage / Parking",
  hotel: "Hôtel",
  invitations: "Invitations",
  carburant: "Carburant",
  materiel: "Matériel & Outillages",
};

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export interface UserProfile {
  nom: string;
  prenom: string;
  fonction: string;
}
