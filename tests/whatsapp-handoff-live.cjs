// Optional live check: reads WhatsApp's launch URL without sending a message.
const assert = require("node:assert/strict");
const https = require("node:https");
const { buildWhatsAppUrl } = require("../shared/whatsapp.js");

const message = [
  "\u{1F9CA} *PEDIDO NUEVO · BARRIO ICE*",
  "\u{1F464} Cliente: María",
  "\u{1F4F1} Celular: 3000000000",
  "\u{1F367} 2x1: Mango + Maracuyá",
  "\u{1F381} Cortesía · ¿Está listo? 100%",
  "\u{1F4CD} Domicilio · \u{1F69A} Entrega · \u{1F3EA} Local",
  "\u{1F4B3} Pago · \u{1F389} Descuento · \u{1F4DD} Nota · \u{1F4B0} Total",
  "\u{1F517} https://barrio-ice.vercel.app/?pedido=123",
].join("\n");
const agents = {
  iPhone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  Android: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
};
function getPage(url, userAgent) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": userAgent, "Accept-Encoding": "identity" } }, (response) => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error("WhatsApp respondió " + response.statusCode)); return; }
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve(body));
      response.on("error", reject);
    });
    request.setTimeout(15000, () => request.destroy(new Error("WhatsApp no respondió a tiempo")));
    request.on("error", reject);
  });
}
(async () => {
  const url = buildWhatsAppUrl("3000000000", message);
  for (const [device, agent] of Object.entries(agents)) {
    const html = await getPage(url, agent);
    const match = html.match(/\["WhatsAppApiOpenUrl","open_custom_url",\[\],\[\{"url":"((?:\\.|[^"\\])*)"/);
    assert.ok(match, "WhatsApp no devolvió el enlace de apertura para " + device);
    const launchUrl = new URL(JSON.parse('"' + match[1] + '"'));
    assert.equal(launchUrl.protocol, "whatsapp:");
    assert.equal(launchUrl.searchParams.get("phone"), "573000000000");
    assert.equal(launchUrl.searchParams.get("text"), message, "El texto cambió para " + device);
    console.log(device + ": WhatsApp conserva todos los emojis y el texto completo.");
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
