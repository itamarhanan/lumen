export interface PropertySchema {
  type: "string" | "number" | "boolean" | "date" | "object" | "array";
  required?: boolean;
  description?: string;
  properties?: Record<string, PropertySchema>;
}

export type PropertiesSchema = Record<string, PropertySchema>;

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

function checkType(
  value: unknown,
  expected: PropertySchema["type"],
  path: string,
): string | null {
  switch (expected) {
    case "string":
      return typeof value === "string" ? null : `${path} should be a string`;
    case "number":
      return typeof value === "number" ? null : `${path} should be a number`;
    case "boolean":
      return typeof value === "boolean" ? null : `${path} should be a boolean`;
    case "date": {
      if (typeof value === "string") return null;
      if (value instanceof Date && !isNaN(value.getTime())) return null;
      return `${path} should be a date string or Date object`;
    }
    case "array":
      return Array.isArray(value) ? null : `${path} should be an array`;
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value)
        ? null
        : `${path} should be an object`;
    default:
      return null;
  }
}

export function validateEvent(
  schema: PropertiesSchema,
  properties: Record<string, unknown>,
  depth = 0,
): ValidationResult {
  const errors: string[] = [];

  for (const [key, propSchema] of Object.entries(schema)) {
    const value = properties[key];

    if (propSchema.required && value === undefined) {
      errors.push(`${key} is required`);
      continue;
    }

    if (value === undefined) continue;

    if (propSchema.type === "object" && propSchema.properties) {
      if (depth >= 3) {
        errors.push(`${key} exceeds maximum nesting depth of 3`);
        continue;
      }
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const nested = validateEvent(
          propSchema.properties,
          value as Record<string, unknown>,
          depth + 1,
        );
        if (nested.errors) {
          errors.push(...nested.errors.map((e) => `${key}.${e}`));
        }
      }
    } else {
      const typeErr = checkType(value, propSchema.type, key);
      if (typeErr) errors.push(typeErr);
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
