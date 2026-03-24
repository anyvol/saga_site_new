/** Секция #contacts на главной странице (с учётом `base` из astro.config). */
export function homeContactsHref(): string {
  const base = import.meta.env.BASE_URL;
  return `${base.replace(/\/+$/, "")}/#contacts`;
}
