(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progressBar = document.querySelector(".scroll-progress span");
  const chip = document.querySelector("#chip");
  const circuitStage = document.querySelector("#circuit-stage");
  const navLinks = [...document.querySelectorAll(".site-nav a[href^='#']")];
  const sections = [...document.querySelectorAll("[data-section]")];
  const projectRows = [...document.querySelectorAll(".project-row")];
  const documentRows = [...document.querySelectorAll(".document-row")];
  let pointerX = 0;
  let pointerY = 0;
  let rafPending = false;

  document.querySelector("#year").textContent = new Date().getFullYear();

  function updateDateTime() {
    const now = new Date();
    document.querySelector("#realtime-date").textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).replace(",", "");
  }

  function updateActiveNavigation() {
    const samplePoint = window.innerHeight * .36;
    let activeId = "";
    sections.forEach((section) => {
      const bounds = section.getBoundingClientRect();
      if (bounds.top <= samplePoint && bounds.bottom > samplePoint) activeId = section.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${activeId}`);
    });
  }

  function updateMotion() {
    rafPending = false;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${maxScroll > 0 ? scrollY / maxScroll : 0})`;

    if (!reduceMotion && chip) {
      const heroProgress = Math.min(Math.max(scrollY / Math.max(window.innerHeight, 1), 0), 1);
      chip.style.transform = `translate3d(0, ${heroProgress * 22}px, 0) rotateX(${7 - heroProgress * 8 - pointerY * 6}deg) rotateY(${-7 + heroProgress * 16 + pointerX * 6}deg) rotateZ(${heroProgress * 4}deg)`;
    }

    updateActiveNavigation();
  }

  function queueUpdate() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(updateMotion);
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .1, rootMargin: "0px 0px -6%" });

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  projectRows.forEach((row) => {
    row.addEventListener("toggle", () => {
      if (!row.open) return;
      projectRows.forEach((otherRow) => {
        if (otherRow !== row) otherRow.open = false;
      });
    });
  });

  documentRows.forEach((row) => {
    row.addEventListener("toggle", () => {
      const label = row.querySelector(".document-actions > span");
      label.textContent = row.open ? "Close" : "Open";
      if (!row.open) return;

      documentRows.forEach((otherRow) => {
        if (otherRow !== row) otherRow.open = false;
      });

      const frame = row.querySelector("iframe[data-src]");
      if (frame && !frame.hasAttribute("src")) frame.src = frame.dataset.src;
    });
  });

  if (circuitStage && !reduceMotion) {
    circuitStage.addEventListener("pointermove", (event) => {
      const bounds = circuitStage.getBoundingClientRect();
      pointerX = Math.min(Math.max((event.clientX - bounds.left) / bounds.width - .5, -.5), .5);
      pointerY = Math.min(Math.max((event.clientY - bounds.top) / bounds.height - .5, -.5), .5);
      queueUpdate();
    });
    circuitStage.addEventListener("pointerleave", () => {
      pointerX = 0;
      pointerY = 0;
      queueUpdate();
    });
  }

  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);

  updateDateTime();
  setInterval(updateDateTime, 30000);
  updateMotion();
})();
