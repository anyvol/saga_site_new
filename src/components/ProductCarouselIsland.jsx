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
        slide.classList.toggle("is-active", index === activeIndex);
      });

      dots.forEach((dot, index) => {
        dot.classList.toggle("is-active", index === activeIndex);
      });

      if (count) {
        count.textContent = `${activeIndex + 1} / ${slides.length}`;
      }

      if (prev) prev.disabled = activeIndex === 0;
      if (next) next.disabled = activeIndex === slides.length - 1;

    };

    prev?.addEventListener("click", () => {
      goTo(getActiveIndex() - 1);
    });

    next?.addEventListener("click", () => {
      goTo(getActiveIndex() + 1);
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => goTo(index));
    });

    let rafId = null;
    let wheelLocked = false;
    let scrollEndTimer = null;
    const resetScrollEndTimer = () => {
      if (!wheelLocked) return;
      if (scrollEndTimer) clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        wheelLocked = false;
        scrollEndTimer = null;
      }, 500);
    };
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

      resetScrollEndTimer();
    };
    carousel.addEventListener("scroll", onScroll, { passive: true });

    let lastGoToTime = 0;
    const setScrollEndLock = () => {
      wheelLocked = true;
      resetScrollEndTimer();
    };
    const onWheel = (e) => {
      if (window.innerWidth <= 860) return;
      if (!wrap.contains(e.target)) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      const deltaH = e.deltaX;
      if (deltaH === 0) return;
      if (carousel.scrollWidth <= carousel.clientWidth) return;

      const atStart = carousel.scrollLeft <= 0;
      const atEnd =
        Math.ceil(carousel.scrollLeft + carousel.clientWidth) >=
        carousel.scrollWidth;

      if ((atStart && deltaH < 0) || (atEnd && deltaH > 0)) return;

      e.preventDefault();
      e.stopPropagation();
      if (wheelLocked) return;
      if (Date.now() - lastGoToTime < 500) return;
      const idx = getActiveIndex();
      const nextIdx = deltaH > 0 ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < slides.length) {
        goTo(nextIdx);
        lastGoToTime = Date.now();
        setScrollEndLock();
      }
    };
    carousel.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });

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
      prev?.removeEventListener("click", () => {
        goTo(getActiveIndex() - 1);
      });
      next?.removeEventListener("click", () => {
        goTo(getActiveIndex() + 1);
      });
      dots.forEach((dot) => {
        dot.replaceWith(dot.cloneNode(true));
      });
      carousel.removeEventListener("scroll", onScroll);
      carousel.removeEventListener("wheel", onWheel);
      carousel.removeEventListener("touchstart", onTouchStart);
      carousel.removeEventListener("touchmove", onTouchMove);
      carousel.removeEventListener("touchend", onTouchEnd);
      carousel.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("resize", onResize);
    };
  }, [sectionId]);

  return null;
}

