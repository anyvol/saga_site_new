import { useEffect } from "react";

export default function ProductCarouselIsland({ sectionId }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const wrap = document.querySelector(
      `[data-carousel-wrap][data-section-id="${sectionId}"]`,
    );
    if (!wrap) return;

    const carousel = wrap.querySelector("[data-carousel]");
    const slides = Array.from(wrap.querySelectorAll("[data-slide]"));
    const prev = wrap.querySelector("[data-carousel-prev]");
    const next = wrap.querySelector("[data-carousel-next]");
    const prevZone = wrap.querySelector("[data-carousel-prev-zone]");
    const nextZone = wrap.querySelector("[data-carousel-next-zone]");
    const dots = Array.from(wrap.querySelectorAll("[data-carousel-dot]"));
    const count = wrap.querySelector("[data-carousel-count]");

    if (!carousel || !slides.length) return;

    const isDesktop = () => window.innerWidth > 860;

    const getActiveIndex = () => {
      let activeIndex = 0;
      let minDiff = Infinity;

      if (isDesktop()) {
        const centerView = carousel.scrollLeft + carousel.clientWidth / 2;
        slides.forEach((slide, index) => {
          const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
          const diff = Math.abs(slideCenter - centerView);
          if (diff < minDiff) {
            minDiff = diff;
            activeIndex = index;
          }
        });
      } else {
        slides.forEach((slide, index) => {
          const diff = Math.abs(slide.offsetLeft - carousel.scrollLeft);
          if (diff < minDiff) {
            minDiff = diff;
            activeIndex = index;
          }
        });
      }
      return activeIndex;
    };

    const goTo = (index) => {
      const target = slides[Math.max(0, Math.min(index, slides.length - 1))];
      if (!target) return;

      const style = window.getComputedStyle(carousel);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;

      const targetLeft = isDesktop()
        ? Math.max(0, target.offsetLeft - paddingLeft)
        : target.offsetLeft;

      const start = carousel.scrollLeft;
      const distance = targetLeft - start;

      if (Math.abs(distance) < 1) {
        carousel.scrollLeft = targetLeft;
        return;
      }

      if (prefersReducedMotion.matches) {
        carousel.scrollLeft = targetLeft;
        return;
      }

      if (!isDesktop()) {
        carousel.scrollLeft = targetLeft;
        return;
      }

      const duration = 360;
      const startTime = performance.now();

      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(t);
        carousel.scrollLeft = start + distance * eased;
        if (t < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    const render = () => {
      const activeIndex = getActiveIndex();

      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.classList.toggle("is-active", isActive);

        if (!isActive) {
          slide.querySelectorAll("details[open]").forEach((detailsEl) => {
            detailsEl.removeAttribute("open");
          });
        }
      });

      dots.forEach((dot, index) => {
        dot.classList.toggle("is-active", index === activeIndex);
      });

      if (count) {
        count.textContent = `${activeIndex + 1} / ${slides.length}`;
      }

      const isPrevDisabled = activeIndex === 0;
      const isNextDisabled = activeIndex === slides.length - 1;

      if (prev) {
        prev.disabled = isPrevDisabled;
        prev.setAttribute("aria-disabled", String(isPrevDisabled));
      }
      if (next) {
        next.disabled = isNextDisabled;
        next.setAttribute("aria-disabled", String(isNextDisabled));
      }
      prevZone?.classList.toggle("is-disabled", isPrevDisabled);
      nextZone?.classList.toggle("is-disabled", isNextDisabled);

    };

    const onPrevClick = () => {
      goTo(getActiveIndex() - 1);
    };

    const onNextClick = () => {
      goTo(getActiveIndex() + 1);
    };

    prev?.addEventListener("click", onPrevClick);
    next?.addEventListener("click", onNextClick);

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => goTo(index));
    });

    let rafId = null;
    let snapTimer = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchActive = false;
    let horizontalSwipe = false;
    let touchStartIndex = 0;

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(render);

      // На десктопе сохраняем доворот к ближайшей карточке.
      if (isDesktop()) {
        if (snapTimer) clearTimeout(snapTimer);
        snapTimer = setTimeout(() => {
          const idx = getActiveIndex();
          goTo(idx);
        }, 140);
      }

    };
    carousel.addEventListener("scroll", onScroll, { passive: true });

    const onTouchStart = (e) => {
      if (isDesktop()) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchEndX = t.clientX;
      touchEndY = t.clientY;
      touchStartIndex = getActiveIndex();
      touchActive = true;
      horizontalSwipe = false;
    };

    const onTouchMove = (e) => {
      if (!touchActive || isDesktop()) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchEndX = t.clientX;
      touchEndY = t.clientY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        horizontalSwipe = true;
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!touchActive || isDesktop()) return;
      touchActive = false;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const swipeThreshold = 6;
      if (Math.abs(dx) < swipeThreshold || (!horizontalSwipe && Math.abs(dx) <= Math.abs(dy))) {
        goTo(touchStartIndex);
        return;
      }

      const direction = dx < 0 ? 1 : -1;
      const targetIndex = Math.max(
        0,
        Math.min(slides.length - 1, touchStartIndex + direction),
      );
      goTo(targetIndex);
    };
    const onTouchCancel = () => {
      if (!touchActive || isDesktop()) return;
      touchActive = false;
      goTo(touchStartIndex);
    };
    carousel.addEventListener("touchstart", onTouchStart, { passive: true });
    carousel.addEventListener("touchmove", onTouchMove, { passive: false });
    carousel.addEventListener("touchend", onTouchEnd, { passive: true });
    carousel.addEventListener("touchcancel", onTouchCancel, { passive: true });

    const onResize = () => render();
    window.addEventListener("resize", onResize);

    render();
    slides[0]?.classList.add("is-active");

    return () => {
      if (snapTimer) clearTimeout(snapTimer);
      prev?.removeEventListener("click", onPrevClick);
      next?.removeEventListener("click", onNextClick);
      dots.forEach((dot) => {
        dot.replaceWith(dot.cloneNode(true));
      });
      carousel.removeEventListener("scroll", onScroll);
      carousel.removeEventListener("touchstart", onTouchStart);
      carousel.removeEventListener("touchmove", onTouchMove);
      carousel.removeEventListener("touchend", onTouchEnd);
      carousel.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("resize", onResize);
    };
  }, [sectionId]);

  return null;
}

