# Как добавлять и редактировать продукты

Сайт собирается из `src/content/products/**/product.json`. Для каждой карточки (модели) должен быть свой `product.json` и набор изображений в `src/assets/products/**`.

## 1) Структура папок

Пример для продукта из категории `qms`:

```text
src/content/products/
  qms/
    syo-19-vertical/
      product.json
```

Изображения продукта лежат рядом в `src/assets/products`:

```text
src/assets/products/
  qms/
    syo-19-vertical/
      syo_19_vertical_saga_front.png
      syo_19_vertical_saga_front.png
```

> `categoryId` и `productId` берутся из пути. Поле `categoryId`/`id` в `product.json` может быть опущено (тогда они берутся из папок), но лучше явно указывать для читаемости.

## 2) Обязательные поля `product.json`

Минимально нормализатор на сервере требует:
- `title` (строка)
- `subtitle` (строка)
- `intro` (строка)
- `images` (массив, хотя бы с 1 изображением)

### Остальные поля (рекомендуется заполнять)
- `order` (число, сортировка внутри категории; по умолчанию `0`)
- `bullets` (массив строк) — список для карточки/страницы линейки
- `details` (массив строк) — дополнительные описания (используются на главной)
- `sectionBooklet` (строка или `null`) — PDF для кнопки
- `longDescription` (строка, опционально)
- `specs` (объект) — техническая информация
- `badge` (строка, опционально)
- `tag` (строка, опционально)

## 3) Поле `sectionBooklet` (кнопка PDF)

Поддерживаются варианты:
- `null` — PDF нет
- `"/assets/booklets/qms_booklet.pdf"` — абсолютный путь (как в примерах)
- `"qms_booklet.pdf"` — имя файла без `/assets/`; будет автоматически приведено к `"/assets/booklets/qms_booklet.pdf"`

Кнопка PDF в карточках и на страницах линеек появляется, только если `sectionBooklet` != `null`.

## 4) Поле `images` (галерея + lightbox)

`images` — массив объектов:

```ts
{
  src: string;
  alt: string;
  kind: "front" | "angle" | "detail" | "context";
  isPrimary?: boolean;
}
```

### `src`

В `src` можно указать:
- полный путь, который начинается с `/` (например `"/assets/products/qms/.../file.png"`)
- или просто имя файла (например `"syo_19_vertical_saga_front.png"`)

Если указан только файл (без `/`), сборка попробует:
`/assets/products/{categoryId}/{productId}/{fileName}`.

Также `isPrimary` отмечает изображение, которое используется как основное на карточке.

### `alt`

Используется для доступности (и как текст fallback для карточек).

## 5) `specs` (техническая информация)

`specs` — это объект `ключ -> значение`, где значение может быть:
- строкой
- числом
- массивом строк/чисел

Пример:

```json
{
  "specs": {
    "Диагональ": "19\"",
    "Питание": "220В",
    "Модули": ["Кардридер", "Принтер"]
  }
}
```

Ключи и значения показываются на странице линейки в блоке "Техническая информация".

## 6) Пример минимального `product.json`

```json
{
  "categoryId": "qms",
  "id": "syo-19-vertical",
  "order": 1,
  "title": "СУО 19″",
  "subtitle": "19″ вертикальная ориентация",
  "intro": "Краткое описание для карточки.",
  "bullets": ["Пункт 1", "Пункт 2"],
  "details": ["Расширение 1", "Расширение 2"],
  "sectionBooklet": "qms_booklet.pdf",
  "specs": {
    "Пример": "Значение"
  },
  "images": [
    {
      "src": "syo_19_vertical_saga_front.png",
      "alt": "Описание изображения",
      "kind": "front",
      "isPrimary": true
    },
    {
      "src": "syo_19_vertical_saga_front.png",
      "alt": "Описание изображения 2",
      "kind": "detail"
    }
  ],
  "badge": null,
  "tag": "qms"
}
```

## 7) Как редактировать старые продукты

1. Открой `src/content/products/{categoryId}/{productId}/product.json`.
2. Меняй текст (`title`, `subtitle`, `intro`, `bullets`, `details`) и `specs`.
3. Для смены фото:
   - добавь/замени файлы в `src/assets/products/{categoryId}/{productId}/`
   - поправь `images[*].src` на имя файла или на абсолютный `/assets/...`.
4. Если меняешь PDF:
   - поставь `sectionBooklet` либо `null`, либо путь/имя файла (см. раздел 3).

