import { api } from "./axios";

export interface SupportCategory {
  code: string;
  name: string;
  description: string;
}

export const UNSPECIFIED_CATEGORY_FILTER = "unspecified";

export async function getSupportCategories() {
  const response = await api.get<SupportCategory[]>("support/categories/");
  return response.data;
}

export function getSupportCategoryName(
  code: string | null | undefined,
  categories: SupportCategory[],
) {
  return categories.find((category) => category.code === code)?.name ?? "Не указана";
}
