export type Part = {
  id: number; name: string; make: string; model: string; year: number;
  condition: string; price: number; status: string;
  description?: string | null; photoUrl?: string | null; createdAt?: string;
};