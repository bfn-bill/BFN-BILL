import { supabase } from "@/integrations/supabase/client";

export type Package = {
  id: string;
  name: string;
  speed: string;
  price: number;
  description: string;
  sort_order?: number;
  enabled?: boolean;
};

export async function fetchEnabledPackages(): Promise<Package[]> {
  const { data } = await supabase
    .from("packages")
    .select("id, name, speed, price, description, sort_order, enabled")
    .eq("enabled", true)
    .order("sort_order");
  return (data as Package[]) ?? [];
}

export async function fetchPackageById(id: string): Promise<Package | null> {
  const { data } = await supabase
    .from("packages")
    .select("id, name, speed, price, description, sort_order, enabled")
    .eq("id", id)
    .maybeSingle();
  return (data as Package) ?? null;
}
