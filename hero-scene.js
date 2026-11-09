(() => {
  "use strict";

  const HERO_WINDOWS = [
    { left: 37.28, top: 43.71, width: 1.44, height: 1.55 },
    { left: 38.24, top: 45.77, width: 1.44, height: 1.55 },
    { left: 58.24, top: 37.63, width: 1.92, height: 1.86 },
    { left: 60, top: 40.41, width: 1.6, height: 1.65 },
    { left: 60.8, top: 44.74, width: 1.92, height: 2.06 },
    { left: 71.2, top: 41.55, width: 0.96, height: 1.34 },
    { left: 73.12, top: 41.55, width: 1.44, height: 1.86 },
  ];
  const HERO_SPARK = { left: 78.88, top: 16.19 };

  function applyBrandTheme() {
    const theme = "dark";
    document.querySelectorAll("img[data-brand]").forEach((image) => {
      const next = `/assets/brand/${image.dataset.brand}-${theme}.webp`;
      if (image.getAttribute("src") !== next) image.setAttribute("src", next);
    });
  }

  function setupHeroMotion(stage) {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) =>
          stage.classList.toggle("is-offscreen", !entry.isIntersecting),
        { threshold: 0.05 },
      ).observe(stage);
    }
    if (reduced || !matchMedia("(pointer: fine)").matches) return;

    const wrap = stage.querySelector(".hero-logo-wrap");
    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      wrap.style.setProperty("--tx", `${(x * 10).toFixed(2)}deg`);
      wrap.style.setProperty("--ty", `${(-y * 8).toFixed(2)}deg`);
    });
    stage.addEventListener("pointerleave", () => {
      wrap.style.setProperty("--tx", "0deg");
      wrap.style.setProperty("--ty", "0deg");
    });
  }

  function buildHeroStage() {
    const hero = document.querySelector(".hero");
    const copy = hero?.querySelector(".hero-copy");
    if (!hero || !copy || hero.querySelector("#heroStage")) return;

    const status = copy.querySelector(".eyebrow");
    const stage = document.createElement("div");
    stage.id = "heroStage";
    stage.className = "hero-stage hero-mark-scene";
    stage.innerHTML = `
      <div class="hero-aura" aria-hidden="true"></div>
      <span class="hero-ring hero-ring-a" aria-hidden="true"></span>
      <span class="hero-ring hero-ring-b" aria-hidden="true"></span>
      <div class="hero-logo-wrap">
        <img class="hero-logo" data-brand="logo" width="625" height="970"
          decoding="async" fetchpriority="high"
          src="data:image/gif;base64,R0lGODlhAQABAAAAACw="
          alt="Barrio Ice Cold Flow: cubo de hielo con la silueta del barrio">
        <span class="hero-spark" aria-hidden="true"
          style="left:${HERO_SPARK.left}%;top:${HERO_SPARK.top}%"></span>
        ${HERO_WINDOWS.map(
          (window, index) =>
            `<i class="hero-win" aria-hidden="true" style="
              left:${window.left}%;top:${window.top}%;
              width:${window.width}%;height:${window.height}%;
              --o:${(index * 0.7).toFixed(1)}s;
              --d:${(4 + (index % 3) * 1.3).toFixed(1)}s"></i>`,
        ).join("")}
      </div>
      ${["one", "two", "three", "four"]
        .map(
          (name) =>
            `<span class="hero-ice-shard shard-${name}" aria-hidden="true"></span>`,
        )
        .join("")}
      <span class="hero-mark-glint" aria-hidden="true"></span>
      ${["a", "b", "c", "d", "e", "f"]
        .map(
          (key) =>
            `<span class="hero-shard hero-shard-${key}" aria-hidden="true"></span>`,
        )
        .join("")}`;

    if (status) hero.insertBefore(status, copy);
    hero.insertBefore(stage, copy);
    const title = copy.querySelector("h1");
    if (title) {
      title.classList.add("sr-only");
      title.textContent = "Barrio Ice";
    }
    applyBrandTheme();
    if ("MutationObserver" in window) {
      new MutationObserver(applyBrandTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }
    setupHeroMotion(stage);
  }

  buildHeroStage();
})();
