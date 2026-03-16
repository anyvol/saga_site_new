export type ProductImageKind = "front" | "angle" | "detail" | "context";

export type ProductImage = {
  /**
   * Путь к изображению относительно корня public,
   * например: "/assets/products/adm/saga-s8/saga_s8_1.jpg".
   *
   * В JSON можно указывать как полный путь, так и только имя файла —
   * в этом случае путь будет собран по схеме:
   *   /assets/products/{categoryId}/{productId}/{fileName}
   *
   * Для картинок, перенесённых в src/assets и подключённых через astro:assets,
   * это поле продолжает использоваться как fallback для <img>, если optimized
   * недоступен.
   */
  src: string;
  alt: string;
  kind: ProductImageKind;
  /**
   * Опциональный флаг для основной картинки,
   * которая используется в карточке на главной.
   */
  isPrimary?: boolean;
  /**
   * Опциональное оптимизированное изображение из astro:assets.
   * Присутствует, если для данного продукта найден файл в src/assets/products.
   */
  // Тип берём как any, чтобы не тянуть внутренние типы astro:assets
  optimized?: any;
};

export type ProductSpecs = Record<string, string | number | (string | number)[]>;

export interface Product {
  /**
   * Уникальный идентификатор продукта.
   * Используется в URL: /products/[id]
   */
  id: string;

  /**
   * Идентификатор категории (atm, adm, qms, ssc, info, charging и т.п.).
   * Используется для привязки к секции каталога.
   */
  categoryId: string;

  /**
   * Порядок сортировки внутри категории.
   */
  order: number;

  /**
   * Краткое название продукта, используется в карточке и на детальной.
   */
  title: string;

  /**
   * Краткая подпись/конфигурация (экран, ориентация и т.п.).
   */
  subtitle: string;

  /**
   * Вводный текст для карточки (аналог текущего text у слайда).
   */
  intro: string;

  /**
   * Основные буллеты, которые сейчас показываются в списке.
   */
  bullets: string[];

  /**
   * Раскрывающиеся подробности (аналог массива details).
   */
  details: string[];

  /**
   * Опциональная ссылка на PDF-буклет для категории/продукта.
   */
  sectionBooklet?: string;

  /**
   * Галерея изображений продукта (несколько ракурсов, детали и т.п.).
   */
  images: ProductImage[];

  /**
   * Более длинное описание для детальной страницы (опционально).
   */
  longDescription?: string;

  /**
   * Структура под характеристики (tab "Характеристики" на детальной странице).
   * В MVP может быть частично заполнена или пустой.
   */
  specs?: ProductSpecs;

  /**
   * Опциональный бейдж для карточки: "Новый", "Флагман" и т.п.
   */
  badge?: string;

  /**
   * Дополнительный тег/лейбл, если потребуется.
   */
  tag?: string;
}

type ProductJson = Omit<Product, "images"> & {
  images: (Omit<ProductImage, "src"> & { src: string })[];
};

const ASSETS_ROOT = "/assets/products";

const productImageModules = import.meta.glob(
  "../assets/products/**/*.{png,jpg,jpeg,webp,avif}",
  {
    eager: true,
  }
);

const buildAssetKey = (options: {
  categoryId: string;
  productId: string;
  fileName: string;
}) => {
  const { categoryId, productId, fileName } = options;
  return `../assets/products/${categoryId}/${productId}/${fileName}`;
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

    const src = resolveImageSrc({
      rawSrc,
      categoryId,
      productId: id,
    });

    let optimized: any;

    // Если в JSON указан только файл без слэшей, пробуем найти его в src/assets/products
    if (rawSrc && !rawSrc.startsWith("/")) {
      const key = buildAssetKey({
        categoryId,
        productId: id,
        fileName: rawSrc,
      });

      const mod = productImageModules[key];

      if (mod) {
        const candidate = (mod as any).default ?? mod;
        optimized = candidate;
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
    sectionBooklet: json.sectionBooklet,
    images,
    longDescription: json.longDescription,
    specs: json.specs,
    badge: json.badge,
    tag: json.tag,
  };

  return product;
};

let cachedProducts: Product[] | null = null;

// Loading all products from src/content/products/**/product.json at build/SSR using import.meta.glob (eager)
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

