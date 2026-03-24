/** Секция #contacts на главной странице (с учётом `base` из astro.config). */
export function homeContactsHref(): string {
  const base = import.meta.env.BASE_URL;
  return `${base.replace(/\/+$/, "")}/#contacts`;
}

/** Страница с условиями обработки персональных данных. */
export function personalDataHref(): string {
  const base = import.meta.env.BASE_URL;
  return `${base.replace(/\/+$/, "")}/legal/personal-data`;
}
