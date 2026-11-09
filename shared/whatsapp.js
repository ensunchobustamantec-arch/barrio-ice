(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BarrioIceWhatsApp = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  function buildWhatsAppUrl(number, message) {
    const digits = String(number || "").replace(/\D/g, "").replace(/^0+/, "");
    const phone = digits.length === 12 && digits.startsWith("57") ? digits : "57" + digits;
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(String(message ?? ""));
  }
  return Object.freeze({ buildWhatsAppUrl });
});
