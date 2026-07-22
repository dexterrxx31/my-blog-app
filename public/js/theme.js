(function () {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function sync() {
    btn.setAttribute("aria-pressed", document.documentElement.dataset.theme === "dark");
  }

  btn.addEventListener("click", function () {
    var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    sync();
  });

  sync();
})();
