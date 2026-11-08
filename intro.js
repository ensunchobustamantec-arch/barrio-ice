(() => {
  "use strict";

  const intro = document.getElementById("barrioIntro");
  if (!intro) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const started = performance.now();
  const duration = reduce ? 700 : 4800;
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    intro.classList.add("intro-leaving");
    window.setTimeout(() => {
      intro.hidden = true;
      document.body.classList.add("intro-finished");
    }, reduce ? 120 : 420);
  }

  intro.querySelector("[data-intro-skip]")?.addEventListener("click", finish);
  window.setTimeout(finish, Math.max(0, duration - (performance.now() - started)));
})();
