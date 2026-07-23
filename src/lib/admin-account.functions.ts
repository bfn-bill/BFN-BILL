import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z
  .object({
    username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/, "invalid username").optional(),
    password: z.string().min(4).max(72).optional(),
  })
  .refine((v) => v.username || v.password, { message: "nothing to update" });

export const updateAdminCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // verify caller is admin (RLS-scoped read on user_roles)
    const { data: roles, error: rolesErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (rolesErr) throw new Error(rolesErr.message);
    if (!roles || roles.length === 0) {
      throw new Response("Forbidden", { status: 403 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { email?: string; password?: string } = {};
    if (data.username) patch.email = `${data.username.toLowerCase()}@admin.local`;
    if (data.password) patch.password = data.password;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, patch);
    if (error) throw new Error(error.message);
    return { ok: true, email: patch.email };
  });
