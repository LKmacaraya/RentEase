export const DB = {
  kSession: "RE_session",
  session() {
    try {
      return JSON.parse(localStorage.getItem(this.kSession));
    } catch {
      return null;
    }
  },
  guard() {
    const session = this.session();
    if (!session || session.role !== "admin") {
      window.location.href = "../index.html";
    }
  },
};

export function money(value) {
  const amount = Number(value);
  return Number.isNaN(amount) ? value : "\u20B1" + amount.toLocaleString();
}

export function placeholderImg(text = "No Photo") {
  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='#111827'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-size='12'>${text}</text></svg>`
    )
  );
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export function notify(message, onOk) {
  const modal = document.getElementById("notifyModal");
  const text = document.getElementById("notifyText");
  const ok = document.getElementById("notifyOk");
  if (!modal || !text || !ok) {
    alert(message);
    return;
  }
  text.textContent = message;
  modal.classList.remove("hidden");
  function close() {
    modal.classList.add("hidden");
    ok.removeEventListener("click", close);
    if (onOk) onOk();
  }
  ok.addEventListener("click", close);
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmText");
    const ok = document.getElementById("confirmOk");
    const cancel = document.getElementById("confirmCancel");

    if (!modal || !text || !ok || !cancel) {
      resolve(window.confirm(message));
      return;
    }

    text.textContent = message;
    modal.classList.remove("hidden");

    function cleanup() {
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
    }

    function close() {
      modal.classList.add("hidden");
      cleanup();
    }

    function onOk() {
      close();
      resolve(true);
    }

    function onCancel() {
      close();
      resolve(false);
    }

    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
  });
}

export function startApiHealthBadge() {
  const status = document.getElementById("apiStatus");
  if (!status || !window.APP_CONFIG) return;

  const url = (window.APP_CONFIG.API_BASE || "") + "/api/health";

  function ping() {
    fetch(url, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(() => {
        status.textContent = "Online";
        status.classList.remove("down");
        status.classList.add("ok");
      })
      .catch(() => {
        status.textContent = "Offline";
        status.classList.remove("ok");
        status.classList.add("down");
      });
  }

  ping();
  setInterval(ping, 10000);
}
