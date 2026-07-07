const GH_OWNER = "luiscvb";
const GH_REPO = "olimpiadas6e";
const GH_BRANCH = "main";
const GH_FILE_PATH = "results.json";
const GH_API_URL = "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + GH_FILE_PATH;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "JSON inválido" });
  }

  if (!process.env.ADMIN_PASS || body.password !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Senha inválida" });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "GH_TOKEN não configurado no Vercel" });
  }

  const payload = {
    data: body.results || {},
    updated: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
  };
  const content = Buffer.from(JSON.stringify(payload, null, 2), "utf-8").toString("base64");

  try {
    const shaRes = await fetch(GH_API_URL, {
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" }
    });
    if (!shaRes.ok) {
      const shaErr = await shaRes.json().catch(() => ({}));
      return res.status(shaRes.status).json({ error: "GET sha " + shaRes.status + ": " + (shaErr.message || shaRes.statusText) });
    }
    const shaData = await shaRes.json();

    const putRes = await fetch(GH_API_URL, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Atualiza classificação",
        content: content,
        sha: shaData.sha,
        branch: GH_BRANCH
      })
    });

    if (!putRes.ok) {
      const putErr = await putRes.json().catch(() => ({}));
      return res.status(putRes.status).json({ error: "PUT " + putRes.status + ": " + (putErr.message || putRes.statusText) });
    }

    return res.status(200).json({ ok: true, updated: payload.updated });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
