const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { buildWhatsAppUrl } = require("../shared/whatsapp.js");
const storefront = fs.readFileSync("../storefront.js", "utf8");
const checkout = fs.readFileSync("../checkout.js", "utf8");
const admin = fs.readFileSync("../admin/admin.js", "utf8");
const whatsapp = fs.readFileSync("../shared/whatsapp.js", "utf8");
assert.match(storefront, /orderMessage/);
assert.match(storefront, /\\u\{1F9CA\}/);
assert.match(checkout, /buildWhatsAppUrl\(menu\.whatsapp, orderMessage\(order\)\)/);
assert.match(admin, /buildWhatsAppUrl\(phone, orderWhatsapp\(order, status\)\)/);
assert.match(whatsapp, /encodeURIComponent\(String\(message/);
assert.doesNotMatch(whatsapp, /encodeURI\(|escape\(/);
const message = [
  String.fromCodePoint(0x1f9ca) + " PEDIDO NUEVO",
  String.fromCodePoint(0x1f464) + " Cliente: Ana",
  String.fromCodePoint(0x1f367) + " PRODUCTOS",
  "2x1: Mango + Maracuyá",
  String.fromCodePoint(0x1f389) + " cortesía",
].join("\n");
const url = buildWhatsAppUrl("3001112233", message);
const encoded = url.split("?text=")[1];
assert.match(url, /%F0%9F/);
assert.doesNotMatch(url, /%3F/);
assert.equal(decodeURIComponent(encoded), message);
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync("../shared/menu-schema.js", "utf8"), sandbox);
const clean = sandbox.window.BarrioShared.clean;
const ice = String.fromCodePoint(0x1f9ca);
assert.equal(clean("x".repeat(29) + ice, 30), "x".repeat(29));
assert.equal(clean("x".repeat(29) + ice, 31), "x".repeat(29) + ice);
assert.doesNotThrow(() => buildWhatsAppUrl("3001112233", clean("x".repeat(29) + ice, 30)));
for (const file of ["../storefront.js", "../checkout.js", "../admin/admin.js", "../admin/pos.js"]) {
  assert.notEqual(fs.readFileSync(file).at(0), "\uFEFF", file + " tiene BOM");
}
console.log("Emoji WhatsApp OK: URL codificada una vez, emojis preservados y UTF-8 sin BOM.");
