import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const OWNER_UID = "NDdEIdTQiqMS947ENRr7aEq1i6B3";
const rulesFile = process.env.FIRESTORE_RULES_FILE || "firestore.rules";
const rules = await readFile(new URL(`../${rulesFile}`, import.meta.url), "utf8");
const environment = await initializeTestEnvironment({
  projectId: "barrio-ice",
  firestore: { rules },
});

function validOrder(overrides = {}) {
  return {
    items: [{ n: "Granizado", s: "Pequeño", p: 12000, q: 1, g: true }],
    cliente: { nombre: "Cliente Prueba", celular: "3001234567" },
    entrega: { tipo: "recoger", direccion: "", referencia: "" },
    pago: "Efectivo",
    conCuanto: 12000,
    notas: "",
    subtotal: 12000,
    descuento: 0,
    domicilio: 0,
    total: 12000,
    promo: "Sin promo",
    mayor18: false,
    tieneLicor: false,
    estado: "Nuevo",
    fecha: "2026-11-05",
    creadoEn: serverTimestamp(),
    ...overrides,
  };
}

function trackingFor(order) {
  return {
    estado: "Nuevo",
    tipo: order.entrega.tipo,
    fecha: order.fecha,
    creadoEn: order.creadoEn,
    nombreCorto: order.cliente.nombre.split(/\s+/)[0].slice(0, 20),
  };
}

async function submitOrder(db, options = {}) {
  const orderRef = doc(collection(db, "pedidos"));
  const order = validOrder(options.order || {});
  const batch = writeBatch(db);
  batch.set(orderRef, order);
  if (options.withTracking !== false) {
    const tracking = Object.assign(trackingFor(order), options.tracking || {});
    batch.set(doc(db, "seguimiento", orderRef.id), tracking);
  }
  await batch.commit();
  return orderRef.id;
}

async function rejectsOrder(options) {
  const db = environment.unauthenticatedContext().firestore();
  const orderRef = doc(collection(db, "pedidos"));
  const order = validOrder(options.order || {});
  const batch = writeBatch(db);
  batch.set(orderRef, order);
  if (options.withTracking !== false) {
    batch.set(
      doc(db, "seguimiento", orderRef.id),
      Object.assign(trackingFor(order), options.tracking || {}),
    );
  }
  await assertFails(batch.commit());
}

try {
  await environment.clearFirestore();
  const anonymous = environment.unauthenticatedContext().firestore();
  const validId = await assertSucceeds(submitOrder(anonymous));

  await rejectsOrder({ withTracking: false });
  await rejectsOrder({ order: { total: 0, subtotal: 0 } });
  await rejectsOrder({ order: { total: 500, subtotal: 500 } });
  await rejectsOrder({ order: { subtotal: 13000 } });
  await rejectsOrder({ order: { subtotal: 12000, total: 5000, descuento: 7000 } });
  await rejectsOrder({ order: { domicilio: 100 } });
  await rejectsOrder({ order: { tieneLicor: true, mayor18: false } });
  await rejectsOrder({
    order: { cliente: { nombre: "Cliente Prueba", celular: "300ABC4567" } },
  });
  await rejectsOrder({
    order: { creadoEn: Timestamp.fromDate(new Date("2000-01-01T00:00:00Z")) },
  });
  await rejectsOrder({ order: { campoExtra: "no permitido" } });

  await assertFails(getDoc(doc(anonymous, "pedidos", validId)));
  await assertSucceeds(getDoc(doc(anonymous, "seguimiento", validId)));
  await assertFails(getDocs(collection(anonymous, "seguimiento")));
  await assertFails(
    updateDoc(doc(anonymous, "seguimiento", validId), { estado: "Preparando" }),
  );

  const owner = environment.authenticatedContext(OWNER_UID).firestore();
  await assertSucceeds(getDoc(doc(owner, "pedidos", validId)));
  await assertSucceeds(getDocs(collection(owner, "pedidos")));
  await assertSucceeds(
    updateDoc(doc(owner, "pedidos", validId), { estado: "Preparando" }),
  );
  await assertSucceeds(
    updateDoc(doc(owner, "seguimiento", validId), {
      estado: "Preparando",
      actualizadoEn: serverTimestamp(),
    }),
  );
  await assertSucceeds(deleteDoc(doc(owner, "pedidos", validId)));
  await assertSucceeds(deleteDoc(doc(owner, "seguimiento", validId)));

  const secondId = await assertSucceeds(submitOrder(anonymous));
  const other = environment.authenticatedContext("otro-usuario").firestore();
  await assertFails(getDoc(doc(other, "pedidos", secondId)));
  await assertFails(getDocs(collection(other, "pedidos")));
  await assertFails(
    updateDoc(doc(other, "pedidos", secondId), { estado: "Preparando" }),
  );
  await assertFails(deleteDoc(doc(other, "pedidos", secondId)));
  await assertFails(
    updateDoc(doc(other, "seguimiento", secondId), { estado: "Preparando" }),
  );

  console.log("Pruebas de reglas Firestore: 27 casos aprobados.");
} finally {
  await environment.cleanup();
}
