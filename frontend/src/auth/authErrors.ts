import { ApiError } from "../lib/api";

type FieldErrors = Record<string, string>;

export const toFieldErrors = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return { form: "Unexpected error. Please try again." };
  }

  const payloadErrors = error.payload?.errors;
  if (payloadErrors && typeof payloadErrors === "object") {
    return payloadErrors as FieldErrors;
  }

  return { form: error.message };
};
