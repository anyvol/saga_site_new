export type ProductImageKind = "front" | "angle" | "detail" | "context";

export type ProductImage = {
  /** Путь к изображению: полный от корня public или имя файла (будет собран автоматически). */
  src: string;
  alt: string;
  kind: ProductImageKind;
  isPrimary?: boolean;
  /** Вариант темы изображения (для карточек с разными ракурсами в dark/light). */
  theme?: "dark" | "light";
  /** Роль изображения в карточке: превью или слайд в лайтбоксе. */
  slot?: "card" | "gallery";
  /** Оптимизированное изображение из astro:assets (если найден файл в src/assets/products). */
  optimized?: any;
};

export type ProductSpecs = Record<string, string | number | (string | number)[]>;

export interface Product {
  id: string;
  categoryId: string;
  order: number;
  title: string;
  subtitle: string;
  intro: string;
  bullets: string[];
  details: string[];
  sectionBooklet?: string | null;
  images: ProductImage[];
  longDescription?: string;
  specs?: ProductSpecs;
  badge?: string;
  tag?: string;
}

type ProductJson = Omit<Product, "images"> & {
  images: (Omit<ProductImage, "src"> & { src: string })[];
};

const ASSETS_ROOT = "/assets/products";

const productImageModules = import.meta.glob(
  "../assets/products/**/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG,WEBP,AVIF}",
  {
    eager: true,
  }
);

const buildAssetKey = (options: {
  categoryId: string;
  productId: string;
  imagePath: string;
}) => {
  const { categoryId, productId, imagePath } = options;
  return `../assets/products/${categoryId}/${productId}/${imagePath.replace(/^\/+/, "")}`;
};

/**
 * Собирает src для изображения на основе структуры папок.
 * Если в JSON указан полный путь (начинается с "/"), он возвращается как есть.
 * Если передано только имя файла, путь строится как:
 *   /assets/products/{categoryId}/{productId}/{fileName}
 */
const resolveImageSrc = (options: {
  rawSrc: string;
  categoryId: string;
  productId: string;
}): string => {
  const { rawSrc, categoryId, productId } = options;

  if (!rawSrc) return rawSrc;

  if (rawSrc.startsWith("/")) {
    return rawSrc;
  }

  return `${ASSETS_ROOT}/${categoryId}/${productId}/${rawSrc}`;
};

/**
 * Извлекает categoryId и productId из пути к файлу product.json.
 * Ожидаемый формат:
 *   ../content/products/{categoryId}/{productId}/product.json
 */
const parseIdsFromPath = (path: string): { categoryId?: string; productId?: string } => {
  const match = path.match(/\/products\/([^/]+)\/([^/]+)\/product\.json$/);

  if (!match) {
    return {};
  }

  const [, categoryId, productId] = match;
  return { categoryId, productId };
};

/**
 * product.json иногда хранит sectionBooklet как:
 * - null
 * - "/assets/booklets/foo.pdf" (уже готовый абсолютный путь)
 * - "foo.pdf" (нужно привести к "/assets/booklets/foo.pdf")
 */
const normalizeSectionBooklet = (href?: string | null): string | null | undefined => {
  if (href === null) return null;
  if (!href) return href;

  // Уже абсолютный путь в assets (или web-путь).
  if (href.startsWith("/assets/")) return href;
  if (href.startsWith("/")) return href;
  if (href.startsWith("http")) return href;

  return href.endsWith(".pdf") ? `/assets/booklets/${href}` : href;
};

const normalizeProduct = (input: {
  json: Partial<ProductJson>;
  filePath: string;
}): Product | null => {
  const { json, filePath } = input;

  const { categoryId: pathCategoryId, productId: pathProductId } = parseIdsFromPath(filePath);

  const id = json.id ?? pathProductId;
  const categoryId = json.categoryId ?? pathCategoryId;

  if (!id || !categoryId) {
    console.warn(
      `[products] Пропущен product.json без id или categoryId: ${filePath}`
    );
    return null;
  }

  if (!json.title || !json.subtitle || !json.intro) {
    console.warn(
      `[products] Пропущен product.json c неполным контентом (title/subtitle/intro): ${filePath}`
    );
    return null;
  }

  const order = typeof json.order === "number" ? json.order : 0;

  const bullets = Array.isArray(json.bullets) ? json.bullets : [];
  const details = Array.isArray(json.details) ? json.details : [];

  const imagesSource = Array.isArray(json.images) ? json.images : [];

  const images: ProductImage[] = imagesSource.map((img) => {
    const rawSrc = img.src;

    let src = resolveImageSrc({
      rawSrc,
      categoryId,
      productId: id,
    });

    let optimized: any;

    // Пытаемся сопоставить с файлом в src/assets/products:
    // 1) по точному относительному пути (поддерживает подпапки m/b),
    // 2) по basename для обратной совместимости старого формата.
    const normalizedRaw = rawSrc?.replace(/^\/+/, "");
    const fileName = rawSrc ? rawSrc.split("/").filter(Boolean).pop() : undefined;
    const candidateKeys = [
      normalizedRaw
        ? buildAssetKey({
            categoryId,
            productId: id,
            imagePath: normalizedRaw,
          })
        : null,
      fileName
        ? buildAssetKey({
            categoryId,
            productId: id,
            imagePath: fileName,
          })
        : null,
    ].filter(Boolean) as string[];

    const mod = candidateKeys
      .map((key) => productImageModules[key])
      .find(Boolean);

    if (mod) {
      const candidate = (mod as any).default ?? mod;
      optimized = candidate;
      // Для изображений из src/assets используем итоговый URL от сборщика,
      // иначе путь вида /assets/products/... приведёт к 404.
      if (candidate && typeof candidate.src === "string") {
        src = candidate.src;
      }
    }

    return {
      ...img,
      src,
      optimized,
    };
  });

  const product: Product = {
    id,
    categoryId,
    order,
    title: json.title,
    subtitle: json.subtitle,
    intro: json.intro,
    bullets,
    details,
    sectionBooklet: normalizeSectionBooklet(json.sectionBooklet),
    images,
    longDescription: json.longDescription,
    specs: json.specs,
    badge: json.badge,
    tag: json.tag,
  };

  return product;
};

let cachedProducts: Product[] | null = null;

// Загрузка product.json из content через import.meta.glob (eager, build-time)
export const loadAllProducts = (): Product[] => {
  if (cachedProducts) {
    return cachedProducts;
  }

  const modules = import.meta.glob<ProductJson>("../content/products/**/product.json", {
    eager: true,
  });

  const products: Product[] = [];

  Object.entries(modules).forEach(([filePath, mod]) => {
    const json = (mod as unknown as { default?: ProductJson }).default ?? (mod as ProductJson);

    const normalized = normalizeProduct({ json, filePath });

    if (normalized) {
      products.push(normalized);
    }
  });

  cachedProducts = products.sort((a, b) => {
    if (a.categoryId === b.categoryId) {
      if (a.order === b.order) {
        return a.title.localeCompare(b.title, "ru");
      }

      return a.order - b.order;
    }

    return a.categoryId.localeCompare(b.categoryId, "ru");
  });

  return cachedProducts;
};

/**
 * Возвращает продукты одной категории, отсортированные по order и title.
 */
export const getProductsByCategory = (categoryId: string): Product[] => {
  return loadAllProducts()
    .filter((product) => product.categoryId === categoryId)
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.title.localeCompare(b.title, "ru");
      }

      return a.order - b.order;
    });
};

/**
 * Возвращает продукт по id (для детальной страницы).
 */
export const getProductById = (id: string): Product | undefined => {
  return loadAllProducts().find((product) => product.id === id);
};

