import express from "express";
import type { Response } from "express";
import cors from "cors";
import { JsonDB, Config } from "node-json-db";

type User = {
  id: number;
  name: string;
  username: string;
  email: string;
};

// true, true = save auto + json indenté
const db = new JsonDB(new Config("data/db", true, true, "/"));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

async function getUsers(): Promise<User[]> {
  return db.getData("/users");
}

function isValidUser(body: any): body is Omit<User, "id"> {
  return (
    body != null &&
    typeof body.name === "string" && body.name.trim() !== "" &&
    typeof body.username === "string" && body.username.trim() !== "" &&
    typeof body.email === "string" && body.email.trim() !== ""
  );
}

// ---- exo 2 : long polling ----

const waiting = new Map<Response, NodeJS.Timeout>();

app.get("/users/poll", (_req, res) => {
  // 204 si rien de neuf au bout de 30s
  const timer = setTimeout(() => res.status(204).end(), 30_000);
  waiting.set(res, timer);
  res.on("close", () => {
    clearTimeout(timer);
    waiting.delete(res);
  });
});

function notify(list: User[]) {
  for (const [res, timer] of waiting) {
    clearTimeout(timer);
    res.json(list);
  }
  waiting.clear();
}

// ---- exo 0 : CRUD users ----

app.get("/users", async (_req, res) => {
  res.status(200).json(await getUsers());
});

app.get("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = (await getUsers()).find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.status(200).json(user);
});

app.post("/users", async (req, res) => {
  if (!isValidUser(req.body)) {
    res.status(400).json({ error: "name, username et email sont obligatoires" });
    return;
  }
  const users = await getUsers();
  const id = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  const { name, username, email } = req.body;
  const user: User = { id, name, username, email };
  // [] = push a la fin
  await db.push("/users[]", user);
  notify([user]);
  res.status(201).json(user);
});

app.put("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  if (!isValidUser(req.body)) {
    res.status(400).json({ error: "name, username et email sont obligatoires" });
    return;
  }
  const { name, username, email } = req.body;
  const user: User = { id, name, username, email };
  await db.push(`/users[${index}]`, user, true);
  res.status(200).json(user);
});

app.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const index = (await getUsers()).findIndex((u) => u.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  await db.delete(`/users[${index}]`);
  res.status(204).end();
});

// ---- exo 1 : polling ----

const NAMES = ["Chaimaa", "Chailas", "Jean", "Sarah", "Yanis", "Lina", "Mehdi", "Camille"];

async function fakeUser(): Promise<User> {
  const users = await getUsers();
  const id = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  const name = NAMES[Math.floor(Math.random() * NAMES.length)]!;
  const username = `${name.toLowerCase()}${id}`;
  return { id, name, username, email: `${username}@esgi.fr` };
}

// ajoute un user toutes les 5s
setInterval(async () => {
  const user = await fakeUser();
  await db.push("/users[]", user);
  notify([user]);
}, 5000);

// on exporte server pour socket.io plus tard
const PORT = Number(process.env.PORT) || 3000;
export const server = app.listen(PORT, () =>
  console.log(`http://localhost:${PORT}`)
);
