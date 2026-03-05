import useSWR from "swr";
import { api } from "../lib/api-client";

export function useSkills() {
  return useSWR("skills", () => api.skills.list());
}

export function useSkill(name: string | null) {
  return useSWR(name ? `skill-${name}` : null, () => api.skills.get(name!));
}

export function useMarketplaceSearch(query: string) {
  return useSWR(
    query ? `marketplace-${query}` : null,
    () => api.skills.marketplaceSearch(query),
    { revalidateOnFocus: false },
  );
}
