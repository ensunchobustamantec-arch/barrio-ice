(function () {
        try {
          var saved = JSON.parse(localStorage.getItem("barrio-ice-theme"));
          var theme =
            saved ||
            (matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light");
          document.documentElement.dataset.theme = theme;
        } catch (error) {
          document.documentElement.dataset.theme = "light";
        }
      })();
