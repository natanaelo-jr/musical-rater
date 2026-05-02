export const focusFirstFieldError = (errors: Record<string, string>) => {
  const fieldName = Object.keys(errors).find(
    (key) => !["form", "credentials"].includes(key),
  );

  if (!fieldName) {
    return;
  }

  const target = document.getElementsByName(fieldName).item(0);
  if (target instanceof HTMLElement) {
    target.focus();
  }
};
