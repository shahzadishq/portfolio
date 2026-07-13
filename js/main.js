/* ==========================================================================
   John® — interactions
   Vanilla JS · transform/opacity only · respects prefers-reduced-motion
   ========================================================================== */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Split text into animatable words ---------- */
  const splitTargets = $$("[data-split]");
  splitTargets.forEach((el) => {
    if (prefersReduced) return;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "word";
            const inner = document.createElement("span");
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    $$(".word > span", el).forEach((s, i) => s.parentElement.style.setProperty("--wi", i));
  });

  /* ---------- Seamless marquees: duplicate content until 2× viewport ---------- */
  $$("[data-marquee] .marquee-track").forEach((track) => {
    // Double the whole track each pass so it always stays two identical
    // halves — the -50% keyframe then loops seamlessly.
    let guard = 0;
    while (track.scrollWidth < window.innerWidth * 2 && guard++ < 4) {
      [...track.children].forEach((node) => {
        const clone = node.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    }
  });

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".reveal, [data-split], .hero-visual, .tl-step, .exp-vitals, .bc-speed, .bc-care").forEach((el) => io.observe(el));

  /* Stagger uptime ticks */
  $$(".uptime-ticks i").forEach((t, i) => t.style.setProperty("--ti", i));

  /* ---------- Header state + scroll progress + back-to-top ---------- */
  const header = $("#siteHeader");
  const progressBar = $("#scrollProgressBar");
  const backTop = $("#backTop");
  const btProgress = $("#btProgress");

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? y / max : 0;

      header.classList.toggle("is-scrolled", y > 24);
      if (progressBar) progressBar.style.transform = `scaleX(${p})`;
      if (backTop) {
        backTop.classList.toggle("is-visible", y > window.innerHeight * 0.8);
        btProgress?.style.setProperty("--p", p.toFixed(3));
      }
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  backTop?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" })
  );

  /* ---------- Active nav (scrollspy) ---------- */
  const navLinks = $$(".nav-link");
  const sections = navLinks
    .map((l) => $(l.getAttribute("href")))
    .filter(Boolean);

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((l) =>
          l.classList.toggle("is-active", l.getAttribute("href") === `#${e.target.id}`)
        );
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => spy.observe(s));

  /* ---------- Mobile menu ---------- */
  const menuToggle = $("#menuToggle");
  const mobileMenu = $("#mobileMenu");
  const setMenu = (open) => {
    menuToggle.classList.toggle("is-open", open);
    mobileMenu.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };
  menuToggle?.addEventListener("click", () =>
    setMenu(!mobileMenu.classList.contains("is-open"))
  );
  $$(".mobile-link").forEach((l) => l.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) setMenu(false);
  });

  /* ---------- Counters ---------- */
  const counters = $$("[data-counter]");
  const counterIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        counterIO.unobserve(e.target);
        const el = e.target;
        const target = parseFloat(el.dataset.counter);
        if (prefersReduced) { el.textContent = target; return; }
        const dur = 1600;
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 4);
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          el.textContent = Math.round(target * ease(p));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((c) => counterIO.observe(c));

  /* ---------- Magnetic buttons ---------- */
  if (!prefersReduced && matchMedia("(pointer: fine)").matches) {
    $$("[data-magnetic]").forEach((btn) => {
      const strength = 0.35;
      let raf = null;
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        });
      });
      btn.addEventListener("mouseleave", () => {
        if (raf) cancelAnimationFrame(raf);
        btn.style.transform = "";
        btn.style.transition = "transform .5s cubic-bezier(.34,1.56,.64,1)";
        setTimeout(() => (btn.style.transition = ""), 500);
      });
    });
  }

  /* ---------- Hero mouse parallax ---------- */
  const heroVisual = $(".hero-visual");
  if (heroVisual && !prefersReduced && matchMedia("(pointer: fine)").matches) {
    const layers = $$(".hv-layer", heroVisual);
    const hero = $(".hero");
    let raf = null;
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        layers.forEach((layer) => {
          const depth = parseFloat(layer.dataset.parallax) || 10;
          layer.style.transform = `translate(${(-nx * depth).toFixed(1)}px, ${(-ny * depth).toFixed(1)}px)`;
        });
      });
    });
    hero.addEventListener("mouseleave", () => {
      if (raf) cancelAnimationFrame(raf);
      layers.forEach((l) => (l.style.transform = ""));
    });
  }

  /* ---------- Portfolio: scroll the long screenshot on hover ---------- */
  $$("[data-scrollshot]").forEach((box) => {
    const img = $(".scrollshot", box);
    if (!img) return;
    const media = box.closest(".case-media") || box;

    const scrollTo = (end) => {
      const delta = Math.max(img.offsetHeight - box.offsetHeight, 0);
      if (!delta) return;
      if (prefersReduced) {
        img.style.transition = "none";
        img.style.transform = end ? `translateY(${-delta}px)` : "";
        return;
      }
      // duration proportional to distance: ~340px/s down, 3× faster back up
      const dur = end ? Math.max(delta / 340, 2.5) : Math.max(delta / 1000, 0.6);
      img.style.transition = `transform ${dur.toFixed(2)}s ${end ? "linear" : "cubic-bezier(.22,1,.36,1)"}`;
      img.style.transform = end ? `translateY(${-delta}px)` : "";
    };

    media.addEventListener("mouseenter", () => scrollTo(true));
    media.addEventListener("mouseleave", () => scrollTo(false));
    // keyboard / touch parity: focusing the case link previews the scroll
    media.addEventListener("focusin", () => scrollTo(true));
    media.addEventListener("focusout", () => scrollTo(false));
  });

  /* ---------- Timeline progress line ---------- */
  const timeline = $("[data-timeline]");
  if (timeline) {
    const updateLine = () => {
      const r = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(Math.max((vh * 0.75 - r.top) / r.height, 0), 1);
      timeline.style.setProperty("--line", progress.toFixed(3));
    };
    window.addEventListener("scroll", updateLine, { passive: true });
    updateLine();
  }

  /* ---------- Terminal typing ---------- */
  const terminal = $("#terminal");
  if (terminal) {
    const lines = $$(".term-line", terminal);
    const termIO = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        termIO.disconnect();
        lines.forEach((line, i) =>
          setTimeout(() => line.classList.add("is-typed"), prefersReduced ? 0 : 350 * i + 200)
        );
      },
      { threshold: 0.4 }
    );
    termIO.observe(terminal);
  }

  /* ---------- FAQ smooth open/close ---------- */
  $$(".faq-item").forEach((item) => {
    const summary = $("summary", item);
    const content = $(".faq-a", item);
    if (!summary || !content) return;

    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (prefersReduced) { item.open = !item.open; return; }

      if (item.open) {
        const h = content.offsetHeight;
        content.style.height = `${h}px`;
        content.offsetHeight; // force reflow
        content.style.transition = "height .35s cubic-bezier(.22,1,.36,1), opacity .25s";
        content.style.height = "0px";
        content.style.opacity = "0";
        content.addEventListener("transitionend", function end() {
          content.removeEventListener("transitionend", end);
          content.style.cssText = "";
          item.open = false;
        });
      } else {
        item.open = true;
        const h = content.offsetHeight;
        content.style.height = "0px";
        content.style.opacity = "0";
        content.offsetHeight;
        content.style.transition = "height .4s cubic-bezier(.22,1,.36,1), opacity .35s .1s";
        content.style.height = `${h}px`;
        content.style.opacity = "1";
        content.addEventListener("transitionend", function end() {
          content.removeEventListener("transitionend", end);
          content.style.cssText = "";
        });
      }
    });
  });

  /* ---------- Contact form (demo handler) ---------- */
  const form = $("#contactForm");
  const status = $("#formStatus");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#f-name");
    const email = $("#f-email");
    const msg = $("#f-msg");
    let valid = true;

    [name, email, msg].forEach((f) => {
      const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle("is-invalid", bad);
      if (bad) valid = false;
    });

    if (!valid) {
      status.textContent = "Please fill in your name, a valid email, and a short message.";
      status.classList.add("is-error");
      ( $(".is-invalid", form) )?.focus();
      return;
    }

    status.classList.remove("is-error");
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    $(".btn-label", btn).textContent = "Sending…";

    // Demo only — wire to your form endpoint / WP handler in production.
    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      $(".btn-label", btn).textContent = "Send message";
      status.textContent = "Thanks — your message is on its way. Expect a reply within 24 hours.";
    }, 900);
  });

  /* ---------- Footer: local time + year ---------- */
  const timeEl = $("#localTime");
  if (timeEl) {
    const renderTime = () => {
      timeEl.textContent = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi",
      });
    };
    renderTime();
    setInterval(renderTime, 30000);
  }
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
