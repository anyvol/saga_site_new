import { useCallback, useEffect, useRef, useState } from "react";

const TOPICS = [
  { value: "product", label: "Продукция" },
  { value: "support", label: "Поддержка" },
  { value: "service", label: "Сервис" },
  { value: "zip", label: "ЗИП" },
  { value: "other", label: "Другое" },
];

/** @param {{ personalDataHref: string; recaptchaSiteKey: string }} props */
export default function LeadModalIsland({ personalDataHref, recaptchaSiteKey }) {
  const dialogRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  /** @type {React.MutableRefObject<number | undefined>} */
  const recaptchaWidgetId = useRef(undefined);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(() => !Boolean(recaptchaSiteKey?.trim()));
  const hasRecaptcha = Boolean(recaptchaSiteKey?.trim());

  const resetFormUi = useCallback(() => {
    setErrors({});
    setSubmitted(false);
    setSubmitting(false);
    const form = dialogRef.current?.querySelector("form");
    form?.reset();
    if (hasRecaptcha && recaptchaWidgetId.current !== undefined && window.grecaptcha?.reset) {
      try {
        window.grecaptcha.reset(recaptchaWidgetId.current);
      } catch {
        /* ignore */
      }
    }
  }, [hasRecaptcha]);

  const open = useCallback(() => {
    resetFormUi();
    dialogRef.current?.showModal();
    window.sagaTrack?.("lead_modal_open", { label: "lead_modal" });
  }, [resetFormUi]);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const onOpen = () => open();
    window.addEventListener("saga:open-lead-modal", onOpen);
    return () => window.removeEventListener("saga:open-lead-modal", onOpen);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => resetFormUi();
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [resetFormUi]);

  useEffect(() => {
    setCaptchaReady(!hasRecaptcha);
  }, [hasRecaptcha]);

  useEffect(() => {
    if (!hasRecaptcha || !recaptchaContainerRef.current) return;
    if (window.grecaptcha?.render && recaptchaContainerRef.current?.childNodes.length > 0) {
      return;
    }

    const renderWidget = () => {
      if (!recaptchaContainerRef.current || !window.grecaptcha?.render) return;
      if (recaptchaWidgetId.current !== undefined) return;
      recaptchaWidgetId.current = window.grecaptcha.render(recaptchaContainerRef.current, {
        sitekey: recaptchaSiteKey.trim(),
        theme: "light",
      });
      setCaptchaReady(true);
    };

    const existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');
    if (window.grecaptcha) {
      window.grecaptcha.ready(renderWidget);
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => window.grecaptcha?.ready(renderWidget));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => window.grecaptcha?.ready(renderWidget);
    document.head.appendChild(script);
  }, [hasRecaptcha, recaptchaSiteKey]);

  const validate = (fd) => {
    const next = {};
    const name = String(fd.get("name") ?? "").trim();
    const topic = String(fd.get("topic") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const consent = fd.get("consent") === "on";

    if (!name) next.name = "Укажите, как к вам обращаться.";
    if (!topic) next.topic = "Выберите тему обращения.";
    if (!phone && !email) {
      next.contact = "Укажите телефон или email — хотя бы одно поле.";
    } else {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        next.email = "Проверьте формат email.";
      }
    }
    if (!consent) next.consent = "Нужно согласие на обработку персональных данных.";

    if (hasRecaptcha) {
      if (recaptchaWidgetId.current === undefined) {
        next.recaptcha = "Подождите, капча загружается.";
      } else {
        const token = window.grecaptcha?.getResponse?.(recaptchaWidgetId.current);
        if (!token) next.recaptcha = "Подтвердите, что вы не робот.";
      }
    }

    return next;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const nextErrors = validate(fd);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 650));
    setSubmitting(false);
    setSubmitted(true);
    window.sagaTrack?.("lead_modal_mock_success", { label: "lead_modal" });
  };

  const onDialogClick = (e) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="lead-modal"
      aria-labelledby={submitted ? "lead-modal-success-title" : "lead-modal-title"}
      onClick={onDialogClick}
    >
      <div className="lead-modal-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lead-modal-close" aria-label="Закрыть" onClick={close}>
          ×
        </button>

        <div
          className={submitted ? "lead-modal-pane is-hidden" : "lead-modal-pane"}
          aria-hidden={submitted}
        >
          <h2 id="lead-modal-title" className="lead-modal-title">
            Оставить заявку
          </h2>
          <p className="lead-modal-lead">Заполните форму — мы ответим по указанным контактам.</p>

          <form className="lead-form lead-modal-form" onSubmit={onSubmit} noValidate>
            <label>
              Как к вам обращаться?
              <input type="text" name="name" autoComplete="name" aria-invalid={errors.name ? "true" : undefined} />
              {errors.name ? <span className="lead-field-error">{errors.name}</span> : null}
            </label>

            <label>
              Тема обращения
              <select name="topic" aria-invalid={errors.topic ? "true" : undefined} defaultValue="">
                <option value="" disabled>
                  Выберите тему
                </option>
                {TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {errors.topic ? <span className="lead-field-error">{errors.topic}</span> : null}
            </label>

            <label>
              Телефон для связи
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                aria-invalid={errors.contact ? "true" : undefined}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                aria-invalid={errors.email || errors.contact ? "true" : undefined}
              />
              {errors.email ? <span className="lead-field-error">{errors.email}</span> : null}
            </label>

            {errors.contact ? (
              <p className="lead-field-error lead-field-error-contact" role="alert">
                {errors.contact}
              </p>
            ) : null}

            <label>
              Компания <span className="lead-optional">необязательно</span>
              <input type="text" name="company" autoComplete="organization" />
            </label>

            <label>
              Комментарий <span className="lead-optional">необязательно</span>
              <textarea name="comment" rows={3} />
            </label>

            {hasRecaptcha ? (
              <div className="lead-recaptcha-wrap">
                <div ref={recaptchaContainerRef} className="g-recaptcha" />
                {errors.recaptcha ? <span className="lead-field-error">{errors.recaptcha}</span> : null}
              </div>
            ) : null}

            <label className="lead-form-consent">
              <input type="checkbox" name="consent" />
              <span>
                Я соглашаюсь на{" "}
                <a href={personalDataHref} target="_blank" rel="noopener noreferrer">
                  обработку персональных данных
                </a>
              </span>
            </label>
            {errors.consent ? (
              <span className="lead-field-error lead-field-error-block">{errors.consent}</span>
            ) : null}

            <div className="lead-modal-actions">
              <button
                type="submit"
                className="btn btn-primary btn-lead-submit"
                disabled={submitting || (hasRecaptcha && !captchaReady)}
              >
                {submitting ? "Отправка…" : "Отправить заявку"}
              </button>
            </div>
          </form>
        </div>

        <div
          className={
            submitted ? "lead-modal-pane lead-modal-success" : "lead-modal-pane lead-modal-success is-hidden"
          }
          aria-hidden={!submitted}
        >
          <h2 id="lead-modal-success-title" className="lead-modal-title">
            Заявка отправлена
          </h2>
          <p className="lead-modal-success-text">
            Спасибо! Мы получили ваши данные и свяжемся с вами в ближайшее время.
          </p>
          <button type="button" className="btn btn-primary btn-lead-submit" onClick={close}>
            Закрыть
          </button>
        </div>
      </div>
    </dialog>
  );
}
