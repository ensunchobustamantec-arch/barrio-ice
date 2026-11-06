(() => {
  "use strict";

  let theme = "light";
  try {
    const saved = JSON.parse(localStorage.getItem("barrio-ice-theme"));
    theme =
      saved ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } catch {}

  document.documentElement.dataset.theme = theme;
})();
