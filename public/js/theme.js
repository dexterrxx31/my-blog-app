(function () {
  // ---- Theme toggle ----
  var btn = document.getElementById("theme-toggle");
  if (btn) {
    var sync = function () {
      btn.setAttribute("aria-pressed", document.documentElement.dataset.theme === "dark");
    };
    btn.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("theme", next);
      sync();
    });
    sync();
  }

  // ---- Scroll-aware nav shadow ----
  var nav = document.querySelector(".site-nav");
  if (nav) {
    var onScrollNav = function () {
      nav.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScrollNav, { passive: true });
    onScrollNav();
  }

  // ---- Reading progress bar (article pages only) ----
  var bar = document.querySelector(".progress-bar");
  if (bar) {
    var onScrollBar = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      bar.style.width = max > 0 ? (100 * doc.scrollTop) / max + "%" : "0%";
    };
    window.addEventListener("scroll", onScrollBar, { passive: true });
    onScrollBar();
  }
})();
