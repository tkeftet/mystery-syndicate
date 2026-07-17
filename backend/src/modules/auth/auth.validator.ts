import { z } from "zod";
import { ValidationError } from "../../shared/errors/AppError";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, underscores",
    ),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

// Login accepts a username OR an email in `identifier`. `email` is still read as
// a fallback so older app builds (which posted `{ email }`) keep working.
export const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .transform((d) => ({
    identifier: (d.identifier ?? d.email ?? "").trim(),
    password: d.password,
  }))
  .refine((d) => d.identifier.length > 0, {
    message: "Username or email is required",
    path: ["identifier"],
  });

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// `any` for the schema's INPUT type so schemas with a `.transform()` (whose
// input differs from output, e.g. loginSchema) are accepted; the return type is
// still the schema's inferred OUTPUT.
export function validate<Output>(
  schema: z.ZodType<Output, z.ZodTypeDef, any>,
  data: unknown,
): Output {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Validation failed";
    throw new ValidationError(message);
  }
  return result.data;
}
