class Store {
  async init(cb) {
    try {
      let b = "https://www.gstatic.com/firebasejs/10.12.2/",
        z = await Promise.all([
          import(b + "firebase-app.js"),
          import(b + "firebase-firestore.js"),
        ]),
        A = z[0],
        F = z[1];
      this.F = F;
      const app = A.initializeApp(window.BarrioShared.FIREBASE_CONFIG);
      if (window.BarrioShared.APP_CHECK_SITE_KEY) {
        if (["localhost", "127.0.0.1"].includes(location.hostname))
          self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        const AC = await import(b + "firebase-app-check.js");
        AC.initializeAppCheck(app, {
          provider: new AC.ReCaptchaV3Provider(
            window.BarrioShared.APP_CHECK_SITE_KEY,
          ),
          isTokenAutoRefreshEnabled: true,
        });
      }
      this.db = F.getFirestore(app);
      this.ref = F.doc(this.db, "tienda", "menu");
      this.ready = true;
      F.onSnapshot(
        this.ref,
        (s) => cb(s.exists() ? s.data() : null),
        () => cb(null),
      );
      return this;
    } catch (e) {
      console.error(e);
      this.ready = false;
      cb(null);
      return this;
    }
  }
  time() {
    return this.F.serverTimestamp();
  }
  async createOrder(order) {
    const { doc, collection, writeBatch } = this.F;
    const reference = doc(collection(this.db, "pedidos"));
    const first =
      (order.cliente.nombre || "")
        .trim()
        .split(/\s+/)[0]
        .slice(0, 20) || "Cliente";
    const batch = writeBatch(this.db);
    batch.set(reference, order);
    batch.set(doc(this.db, "seguimiento", reference.id), {
      estado: "Nuevo",
      tipo: order.entrega.tipo,
      fecha: order.fecha,
      creadoEn: order.creadoEn,
      nombreCorto: first,
    });
    await batch.commit();
    return reference.id;
  }
  watchTracking(id, ok, bad) {
    return this.F.onSnapshot(
      this.F.doc(this.db, "seguimiento", id),
      (s) =>
        ok(s.exists() ? Object.assign({ id: s.id }, s.data()) : null),
      bad,
    );
  }
}
