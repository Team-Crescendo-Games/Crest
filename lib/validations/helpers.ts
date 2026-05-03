import { z } from "zod";

type ParseSuccess<T> = { success: true; data: z.infer<T> };
type ParseFailure = { success: false; error: string };
type ParseResult<T extends z.ZodType> = ParseSuccess<T> | ParseFailure;

export function parseFormData<T extends z.ZodType>(
  schema: T,
  formData: FormData,
  arrayFields?: string[],
): ParseResult<T> {
  const obj: Record<string, unknown> = {};

  for (const key of formData.keys()) {
    if (arrayFields?.includes(key)) {
      obj[key] = formData.getAll(key);
    } else {
      obj[key] = formData.get(key);
    }
  }

  const result = schema.safeParse(obj);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
}
