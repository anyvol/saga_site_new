import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function ImageLightboxIsland() {
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrcs, setImageSrcs] = useState([]);
  const [imageAlts, setImageAlts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const closeBtnRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const stageRef = useRef(null);

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchLastXRef = useRef(0);
  const touchActiveRef = useRef(false);

  const imagesLength = imageSrcs.length;
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < imagesLength - 1;

  const close = useCallback(() => {
    setIsOpen(false);
    setImageSrcs([]);
    setImageAlts([]);
    setActiveIndex(0);

    const previouslyFocused = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  }, []);

  const openFromTrigger = useCallback((triggerEl) => {
    if (!triggerEl) return;

    const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const rawSrcs =
      triggerEl.getAttribute(
        theme === "light" ? "data-lightbox-srcs-light" : "data-lightbox-srcs-dark"
      ) || triggerEl.getAttribute("data-lightbox-srcs");
    const rawAlts =
      triggerEl.getAttribute(
        theme === "light" ? "data-lightbox-alts-light" : "data-lightbox-alts-dark"
      ) || triggerEl.getAttribute("data-lightbox-alts");
    const rawStartIndex = triggerEl.getAttribute("data-lightbox-start-index");

    const parsedSrcs = safeJsonParse(rawSrcs);
    const urls = Array.isArray(parsedSrcs)
      ? parsedSrcs.filter((s) => typeof s === "string" && s.trim().length > 0)
      : [];
    if (!urls.length) return;

    const parsedAlts = safeJsonParse(rawAlts);
    const alts = Array.isArray(parsedAlts)
      ? urls.map((_, i) => (typeof parsedAlts[i] === "string" ? parsedAlts[i] : ""))
      : urls.map(() => "");

    const startIndex = Number.parseInt(rawStartIndex || "0", 10);
    const normalizedStart = Number.isFinite(startIndex)
      ? Math.max(0, Math.min(startIndex, urls.length - 1))
      : 0;

    previouslyFocusedRef.current = document.activeElement;
    setImageSrcs(urls);
    setImageAlts(alts);
    setActiveIndex(normalizedStart);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const triggers = Array.from(document.querySelectorAll("[data-open-lightbox]"));
    if (!triggers.length) return;

    const onClick = (e) => {
      const target = e.currentTarget;
      openFromTrigger(target);
    };

    triggers.forEach((el) => el.addEventListener("click", onClick));
    return () => triggers.forEach((el) => el.removeEventListener("click", onClick));
  }, [openFromTrigger]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (canPrev) setActiveIndex((v) => Math.max(0, v - 1));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (canNext) setActiveIndex((v) => Math.min(imagesLength - 1, v + 1));
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const t = window.setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [close, canPrev, canNext, imagesLength, isOpen]);

  const handleSwipeToPrev = useCallback(() => {
    if (!canPrev) return;
    setActiveIndex((v) => Math.max(0, v - 1));
  }, [canPrev]);

  const handleSwipeToNext = useCallback(() => {
    if (!canNext) return;
    setActiveIndex((v) => Math.min(imagesLength - 1, v + 1));
  }, [canNext, imagesLength]);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
    touchLastXRef.current = t.clientX;
    touchActiveRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchActiveRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartXRef.current;
    const dy = Math.abs(t.clientY - touchStartYRef.current);

    // Если пользователь скроллит по вертикали — не считаем это свайпом.
    if (dy > 80 && Math.abs(dx) < 40) {
      touchActiveRef.current = false;
      return;
    }

    touchLastXRef.current = t.clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;

    const dx = touchLastXRef.current - touchStartXRef.current;
    const threshold = 48;

    if (Math.abs(dx) < threshold) return;

    if (dx < 0) {
      handleSwipeToNext();
    } else {
      handleSwipeToPrev();
    }
  }, [handleSwipeToNext, handleSwipeToPrev]);

  const activeSrc = useMemo(() => imageSrcs[activeIndex], [activeIndex, imageSrcs]);
  const activeAlt = useMemo(() => imageAlts[activeIndex] || "", [activeIndex, imageAlts]);

  if (!isOpen) return null;

  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображений"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="lightbox-dialog">
        <button
          ref={closeBtnRef}
          className="lightbox-close"
          type="button"
          aria-label="Закрыть"
          onClick={close}
        >
          <span aria-hidden="true">×</span>
        </button>

        <div
          ref={stageRef}
          className="lightbox-stage"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button
            className="lightbox-nav"
            type="button"
            aria-label="Предыдущее изображение"
            onClick={handleSwipeToPrev}
            disabled={!canPrev}
            data-dir="prev"
          >
            <span aria-hidden="true">←</span>
          </button>

          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img
            className="lightbox-image"
            src={activeSrc}
            alt={activeAlt}
            draggable={false}
          />

          <button
            className="lightbox-nav"
            type="button"
            aria-label="Следующее изображение"
            onClick={handleSwipeToNext}
            disabled={!canNext}
            data-dir="next"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {imagesLength > 1 ? (
          <div className="lightbox-counter" aria-label="Номер изображения">
            {activeIndex + 1} / {imagesLength}
          </div>
        ) : null}
      </div>
    </div>
  );
}

