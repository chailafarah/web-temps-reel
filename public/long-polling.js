const list = document.getElementById("users");
const totalEl = document.getElementById("total");
const timeoutEl = document.getElementById("timeout");

let total = 0;
let timeouts = 0;

function render(u) {
  const li = document.createElement("li");
  li.textContent = `#${u.id} ${u.name} (@${u.username}) - ${u.email}`;
  list.appendChild(li);
}

async function poll(signal) {
  try {
    const res = await fetch("/users/poll", { signal });
    total++;
    if (res.status === 200) {
      for (const u of await res.json()) render(u);
    } else if (res.status === 204) {
      timeouts++;
    }
    totalEl.textContent = total;
    timeoutEl.textContent = timeouts;
  } catch {
    // serveur coupé -> on attend 2s avant de retenter
    await new Promise((r) => setTimeout(r, 2000));
  } finally {
    if (!signal.aborted) poll(signal);
  }
}

const ctrl = new AbortController();
poll(ctrl.signal);
window.addEventListener("pagehide", () => ctrl.abort());
