const GH_OWNER = "luiscvb";
const GH_REPO = "olimpiadas6e";
const GH_BRANCH = "main";
const GH_FILE_PATH = "results.json";
const GH_API_URL = "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + GH_FILE_PATH;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  if (!process.env.ADMIN_PASS || body.password !== process.env.ADMIN_PASS) {
    return { statusCode: 401, body: JSON.stringify({ error: "Senha inválida" }) };
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: "GH_TOKEN não configurado no Netlify" }) };
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
      return { statusCode: shaRes.status, body: JSON.stringify({ error: "GET sha " + shaRes.status + ": " + (shaErr.message || shaRes.statusText) }) };
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
      return { statusCode: putRes.status, body: JSON.stringify({ error: "PUT " + putRes.status + ": " + (putErr.message || putRes.statusText) }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, updated: payload.updated }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
