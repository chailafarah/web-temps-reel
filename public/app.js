const list = document.getElementById("users");
const totalEl = document.getElementById("total");
const emptyEl = document.getElementById("empty");

// pour pas afficher 2 fois le meme user
const seen = new Set();
let total = 0;
let empty = 0;

function render(u) {
  const li = document.createElement("li");
  li.textContent = `#${u.id} ${u.name} (@${u.username}) - ${u.email}`;
  list.appendChild(li);
}

setInterval(async () => {
  const res = await fetch("/users");
  const users = await res.json();
  let added = 0;
  for (const u of users) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    render(u);
    added++;
  }
  // bonus
  total++;
  if (added === 0) empty++;
  totalEl.textContent = total;
  emptyEl.textContent = empty;
}, 1000);
