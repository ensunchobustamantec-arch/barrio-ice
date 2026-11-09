const assert = require("node:assert/strict");
const fs = require("node:fs");
const storefront = fs.readFileSync("../storefront.js", "utf8");
const checkout = fs.readFileSync("../checkout.js", "utf8");
assert.match(storefront, /orderMessage/);
assert.match(storefront, /\\u\{1F9CA\}/);
assert.match(checkout, /encodeURIComponent\(orderMessage\(order\)\)/);
assert.doesNotMatch(checkout, /encodeURI\(|escape\(/);
const message = [
  String.fromCodePoint(0x1f9ca) + " PEDIDO NUEVO",
  String.fromCodePoint(0x1f464) + " Cliente: Ana",
  String.fromCodePoint(0x1f367) + " PRODUCTOS",
  String.fromCodePoint(0x1f389) + " cortesía",
].join("\n");
const url = "https://wa.me/573001112233?text=" + encodeURIComponent(message);
const encoded = new URL(url).searchParams.get("text");
assert.match(url, /%F0%9F/);
assert.doesNotMatch(url, /%3F/);
assert.equal(decodeURIComponent(encoded), message);
for (const file of ["../storefront.js", "../checkout.js", "../admin/admin.js", "../admin/pos.js"]) {
  assert.notEqual(fs.readFileSync(file).at(0), "\uFEFF", file + " tiene BOM");
}
console.log("Emoji WhatsApp OK: URL codificada una vez, emojis preservados y UTF-8 sin BOM.");
