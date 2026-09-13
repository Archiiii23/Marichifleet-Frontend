import type {
  Booking,
  BookingStatus,
  Branch,
  Checkpoint,
  Client,
  ComplianceDoc,
  DbShape,
  Driver,
  FuelLog,
  Invoice,
  JobCard,
  Notification,
  Payment,
  Pod,
  RateCard,
  Trip,
  Vehicle,
} from "./types";

/** Deterministic PRNG so every session sees the same demo company. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const CITIES = [
  { city: "Mumbai", lat: 19.076, lng: 72.877 },
  { city: "Pune", lat: 18.52, lng: 73.856 },
  { city: "Nashik", lat: 19.997, lng: 73.789 },
  { city: "Surat", lat: 21.17, lng: 72.831 },
  { city: "Ahmedabad", lat: 23.022, lng: 72.571 },
  { city: "Indore", lat: 22.719, lng: 75.857 },
  { city: "Nagpur", lat: 21.146, lng: 79.088 },
  { city: "Hyderabad", lat: 17.385, lng: 78.486 },
  { city: "Bengaluru", lat: 12.972, lng: 77.594 },
  { city: "Chennai", lat: 13.083, lng: 80.271 },
  { city: "Delhi NCR", lat: 28.613, lng: 77.209 },
  { city: "Jaipur", lat: 26.912, lng: 75.787 },
  { city: "Kolkata", lat: 22.573, lng: 88.364 },
  { city: "Raipur", lat: 21.251, lng: 81.63 },
  { city: "Vadodara", lat: 22.307, lng: 73.181 },
  { city: "Kochi", lat: 9.931, lng: 76.267 },
];

/** City lookup used by booking forms and lane pickers. */
export const CITY_INDEX: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  CITIES.map((c) => [c.city, { lat: c.lat, lng: c.lng }]),
);



export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.22);
}

const DRIVER_NAMES = [
  "Ramesh Yadav", "Suresh Pawar", "Imran Sheikh", "Balwinder Singh", "Ganesh More",
  "Vikram Rathod", "Anil Kumar", "Sandeep Jadhav", "Mohd Arif", "Rajesh Nair",
  "Prakash Bhosale", "Deepak Chauhan", "Satish Gaikwad", "Kiran Patil", "Hari Om Mishra",
  "Jaswant Meena", "Naresh Solanki", "Mukesh Verma", "Tushar Salvi", "Ashok Rane",
  "Pravin Dhole", "Feroz Khan",
];

const CLIENT_DEFS: Array<[string, Client["segment"], string]> = [
  ["Adarsh Steel Works", "Manufacturer", "Pune"],
  ["Kaveri Agro Distributors", "Distributor", "Nashik"],
  ["BlueLane 3PL Services", "3PL", "Mumbai"],
  ["Sunrise Ceramics Ltd", "Manufacturer", "Ahmedabad"],
  ["Meridian Warehousing", "Warehouse", "Surat"],
  ["Trishul Cements", "Manufacturer", "Indore"],
  ["Nova Retail Supply", "Retail", "Bengaluru"],
  ["Deccan Polymers", "Manufacturer", "Hyderabad"],
  ["GreenHarvest Foods", "Distributor", "Nagpur"],
  ["Anchor Auto Components", "Manufacturer", "Chennai"],
  ["Sagar Coldchain", "Warehouse", "Kochi"],
  ["Vertex Electricals", "Distributor", "Delhi NCR"],
  ["Pioneer Paper Mills", "Manufacturer", "Raipur"],
  ["Orbit Consumer Brands", "Retail", "Kolkata"],
];

const CARGO = [
  "TMT steel bars", "Packaged rice (50kg bags)", "Ceramic tiles", "PET granules",
  "Cement bags", "FMCG mixed pallets", "Auto spare parts", "Cold-chain dairy",
  "Paper reels", "Electrical fittings", "Textile bales", "Aluminium coils",
];

const MAKES = ["Tata Signa", "Ashok Leyland 3718", "BharatBenz 2823", "Eicher Pro 6028", "Tata Prima"];
const VEHICLE_TYPES: Vehicle["type"][] = ["Truck", "Trailer", "Container", "Tanker", "LCV"];

const iso = (base: number, hours: number) => new Date(base + hours * 3600_000).toISOString();

function makeRoute(a: { lat: number; lng: number }, b: { lat: number; lng: number }, r: () => number) {
  const pts: Array<{ lat: number; lng: number }> = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bow = Math.sin(t * Math.PI) * 0.55;
    pts.push({
      lat: a.lat + (b.lat - a.lat) * t + bow * (r() - 0.4) * 0.5,
      lng: a.lng + (b.lng - a.lng) * t + bow * (r() - 0.4) * 0.5,
    });
  }
  return pts;
}

export function buildSeed(nowMs: number): DbShape {
  const r = rng(20260909);
  const T = "tn_marichi";

  const tenant = { id: T, name: "Marichi Roadways Pvt Ltd", country: "India", currency: "INR" };

  const branches: Branch[] = [
    { id: "br_pune", tenantId: T, name: "Pune Central Depot", city: "Pune", lat: 18.52, lng: 73.856 },
    { id: "br_bhiwandi", tenantId: T, name: "Bhiwandi Hub", city: "Mumbai", lat: 19.29, lng: 73.06 },
    { id: "br_indore", tenantId: T, name: "Indore Depot", city: "Indore", lat: 22.719, lng: 75.857 },
  ];

  const vehicles: Vehicle[] = [];
  for (let i = 0; i < 18; i++) {
    const home = CITIES[Math.floor(r() * 8)];
    vehicles.push({
      id: `veh_${i + 1}`,
      tenantId: T,
      branchId: branches[i % 3].id,
      regNo: `MH ${12 + (i % 6)} ${String.fromCharCode(65 + (i % 20))}${String.fromCharCode(70 + (i % 7))} ${1000 + i * 137}`,
      make: MAKES[i % MAKES.length],
      type: VEHICLE_TYPES[i % VEHICLE_TYPES.length],
      capacityTons: [9, 16, 21, 25, 32][i % 5],
      status: "available",
      odometerKm: 40_000 + Math.floor(r() * 380_000),
      fuelPct: 22 + Math.floor(r() * 74),
      lat: home.lat + (r() - 0.5) * 0.4,
      lng: home.lng + (r() - 0.5) * 0.4,
      speedKph: 0,
      lastPingISO: iso(nowMs, -(r() * 2)),
      serviceDueKm: 5_000 + Math.floor(r() * 12_000),
    });
  }
  vehicles[4].status = "maintenance";
  vehicles[11].status = "maintenance";
  vehicles[16].status = "inactive";

  const drivers: Driver[] = DRIVER_NAMES.map((name, i) => ({
    id: `drv_${i + 1}`,
    tenantId: T,
    branchId: branches[i % 3].id,
    name,
    phone: `+91 9${String(700000000 + i * 1234567).slice(0, 9)}`,
    licenceNo: `MH${20 + (i % 9)} ${2015 + (i % 8)}00${1000 + i * 31}`,
    licenceExpiryISO: iso(nowMs, (i % 5 === 3 ? -20 : 90 + i * 40) * 24),
    status: "available",
    rating: Math.round((3.7 + r() * 1.2) * 10) / 10,
    tripsCompleted: 20 + Math.floor(r() * 260),
    assignedVehicleId: i < 18 ? `veh_${i + 1}` : undefined,
  }));
  drivers[6].status = "leave";
  drivers[15].status = "rest";
  drivers[20].status = "inactive";

  const clients: Client[] = CLIENT_DEFS.map(([name, segment, city], i) => ({
    id: `cli_${i + 1}`,
    tenantId: T,
    name,
    segment,
    contactName: ["Rohit Kulkarni", "Neha Sharma", "Arun Menon", "Sneha Iyer", "Vivek Malhotra"][i % 5],
    phone: `+91 8${String(810000000 + i * 7654321).slice(0, 9)}`,
    email: `ops@${name.toLowerCase().replace(/[^a-z]+/g, "")}.co.in`,
    city,
    gstin: `27AAB${String.fromCharCode(65 + i)}C${2000 + i}D1Z${i % 10}`,
    creditDays: [15, 30, 45][i % 3],
    ratePerKm: 38 + Math.floor(r() * 22),
  }));

  const rateCards: RateCard[] = clients.flatMap((c, i) =>
    VEHICLE_TYPES.map((vt, j) => ({
      id: `rc_${i + 1}_${j}`,
      clientId: c.id,
      vehicleType: vt,
      perKm: c.ratePerKm + j * 4,
      minCharge: 6500 + j * 1800,
    })),
  );

  // Status script: guarantees every lifecycle stage is represented on load.
  const script: BookingStatus[] = [
    "draft", "draft", "submitted", "submitted", "submitted",
    "confirmed", "confirmed", "confirmed", "confirmed",
    "assigned", "assigned", "assigned",
    "dispatched", "dispatched",
    "in_transit", "in_transit", "in_transit", "in_transit", "in_transit", "in_transit",
    "delivered", "delivered",
    "pod_pending", "pod_pending", "pod_pending",
    "pod_received", "pod_received",
    "invoiced", "invoiced", "invoiced", "invoiced",
    "partially_paid", "partially_paid",
    "paid", "paid", "paid", "paid", "paid",
    "closed", "closed", "closed", "closed",
    "cancelled",
  ];
  while (script.length < 62) script.push(["paid", "closed", "in_transit", "confirmed"][script.length % 4] as BookingStatus);

  const bookings: Booking[] = [];
  const trips: Trip[] = [];
  const pods: Pod[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const notifications: Notification[] = [];
  let vIdx = 0;
  let dIdx = 0;

  const tripStages: Record<string, Trip["status"]> = {
    assigned: "driver_assigned",
    dispatched: "driver_accepted",
    in_transit: "in_transit",
    delivered: "arrived",
    pod_pending: "delivered",
    pod_received: "pod_uploaded",
    invoiced: "completed",
    partially_paid: "completed",
    paid: "completed",
    closed: "completed",
  };

  script.forEach((status, i) => {
    const client = clients[i % clients.length];
    let a = CITIES[Math.floor(r() * CITIES.length)];
    let b = CITIES[Math.floor(r() * CITIES.length)];
    if (a.city === b.city) b = CITIES[(CITIES.indexOf(a) + 5) % CITIES.length];
    const km = distanceKm(a, b);
    const vehicleType = VEHICLE_TYPES[i % VEHICLE_TYPES.length];
    const rateCard = rateCards.find((rc) => rc.clientId === client.id && rc.vehicleType === vehicleType)!;
    const rate = Math.max(rateCard.minCharge, Math.round((km * rateCard.perKm) / 100) * 100);
    const ageH = -(6 + i * 7 + r() * 10);
    const bookingId = `bk_${i + 1}`;
    const ref = `MF-${25001 + i}`;

    const booking: Booking = {
      id: bookingId,
      ref,
      tenantId: T,
      clientId: client.id,
      status,
      pickup: { city: a.city, address: `Gate ${2 + (i % 7)}, ${a.city} Industrial Estate`, lat: a.lat, lng: a.lng },
      drop: { city: b.city, address: `${b.city} Distribution Centre, Sector ${3 + (i % 9)}`, lat: b.lat, lng: b.lng },
      distanceKm: km,
      cargo: CARGO[i % CARGO.length],
      weightTons: 6 + Math.floor(r() * 24),
      vehicleType,
      priority: (["standard", "standard", "express", "standard", "critical"] as const)[i % 5],
      rate,
      pickupISO: iso(nowMs, ageH + 8),
      createdISO: iso(nowMs, ageH),
      createdBy: i % 3 === 0 ? "Client portal" : "Dispatch desk",
    };

    notifications.push({
      id: `nt_b${i}`,
      event: "BOOKING_CREATED",
      channel: "whatsapp",
      recipient: client.phone,
      recipientRole: "client",
      body: `Booking ${ref} received: ${a.city} → ${b.city}, ${booking.cargo}.`,
      status: "delivered",
      attempts: 1,
      atISO: booking.createdISO,
      link: `/app/bookings/${bookingId}`,
      entityRef: ref,
    });

    const tripStage = tripStages[status];
    if (tripStage) {
      // pick an operable vehicle + driver
      let vehicle = vehicles[vIdx % vehicles.length];
      let guard = 0;
      while ((vehicle.status !== "available" || vehicle.currentTripId) && guard++ < 30) {
        vIdx++;
        vehicle = vehicles[vIdx % vehicles.length];
      }
      let driver = drivers[dIdx % drivers.length];
      guard = 0;
      while (driver.status !== "available" && guard++ < 30) {
        dIdx++;
        driver = drivers[dIdx % drivers.length];
      }
      vIdx++;
      dIdx++;

      const tripId = `tr_${i + 1}`;
      const route = makeRoute(a, b, r);
      const live = ["in_transit", "dispatched"].includes(status);
      const progress = live ? 0.15 + r() * 0.7 : tripStage === "completed" || tripStage === "pod_uploaded" || tripStage === "delivered" || tripStage === "arrived" ? 1 : 0;
      const delayMins = live && i % 4 === 0 ? 35 + Math.floor(r() * 160) : 0;
      const checkpoints: Checkpoint[] = [
        { id: `${tripId}_c1`, label: "Loading at origin", city: a.city, lat: a.lat, lng: a.lng },
        { id: `${tripId}_c2`, label: "Highway checkpoint", city: "Midway", lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 },
        { id: `${tripId}_c3`, label: "City entry", city: b.city, lat: b.lat - 0.15, lng: b.lng - 0.15 },
        { id: `${tripId}_c4`, label: "Unloading at destination", city: b.city, lat: b.lat, lng: b.lng },
      ];
      const doneCount = progress >= 1 ? 4 : progress > 0.66 ? 3 : progress > 0.33 ? 2 : progress > 0 ? 1 : 0;
      checkpoints.forEach((c, ci) => {
        if (ci < doneCount) c.doneISO = iso(nowMs, ageH + 8 + ci * 4);
      });

      const fuelCost = Math.round(km * 11.4);
      const trip: Trip = {
        id: tripId,
        ref: `TRP-${9001 + i}`,
        tenantId: T,
        bookingId,
        vehicleId: vehicle.id,
        driverId: driver.id,
        status: delayMins > 0 && live ? "exception" : tripStage,
        checkpoints,
        progress,
        etaISO: iso(nowMs, live ? (1 - progress) * 14 + delayMins / 60 : ageH + 20),
        delayMins,
        startedISO: progress > 0 ? iso(nowMs, ageH + 8) : undefined,
        deliveredISO: progress >= 1 ? iso(nowMs, ageH + 22) : undefined,
        route,
        revenue: rate,
        fuelCost,
        tollCost: Math.round(km * 2.1),
        driverCost: Math.round(km * 3.4),
        exception:
          delayMins > 0 && live
            ? { type: i % 8 === 0 ? "Breakdown" : "Traffic / road closure", note: "Driver reported hold-up near toll plaza.", atISO: iso(nowMs, -2) }
            : undefined,
      };
      trips.push(trip);
      booking.tripId = tripId;

      if (progress > 0 && progress < 1) {
        const p = route[Math.min(route.length - 1, Math.floor(progress * route.length))];
        vehicle.status = "on_trip";
        vehicle.currentTripId = tripId;
        vehicle.lat = p.lat;
        vehicle.lng = p.lng;
        vehicle.speedKph = delayMins > 0 ? 0 : 38 + Math.floor(r() * 42);
        vehicle.lastPingISO = iso(nowMs, -(r() * 0.4));
        driver.status = "on_trip";
        driver.assignedVehicleId = vehicle.id;
      }

      if (["pod_received", "invoiced", "partially_paid", "paid", "closed"].includes(status)) {
        const podId = `pod_${i + 1}`;
        pods.push({
          id: podId,
          tripId,
          bookingId,
          receiverName: ["Store Manager", "Warehouse In-charge", "Security Desk"][i % 3],
          signatureSeed: `${i * 37}`,
          photoNote: "Consignment photo captured at unloading bay.",
          otp: String(100000 + ((i * 4391) % 899999)),
          capturedISO: iso(nowMs, ageH + 23),
          verified: true,
        });
        trip.podId = podId;
      }

      if (["invoiced", "partially_paid", "paid", "closed"].includes(status)) {
        const invId = `inv_${i + 1}`;
        const lines = [
          { label: `Freight ${a.city} → ${b.city} (${km} km)`, amount: rate },
          { label: "Loading / unloading", amount: 1200 },
          { label: "Detention charges", amount: i % 3 === 0 ? 1800 : 0 },
        ].filter((l) => l.amount > 0);
        const subtotal = lines.reduce((s, l) => s + l.amount, 0);
        const total = Math.round(subtotal * 1.12);
        const paid = status === "paid" || status === "closed" ? total : status === "partially_paid" ? Math.round(total * 0.4) : 0;
        const overdue = status === "invoiced" && i % 4 === 1;
        const invoice: Invoice = {
          id: invId,
          ref: `INV-${7001 + i}`,
          tenantId: T,
          clientId: client.id,
          bookingId,
          tripId,
          status: paid >= total ? "paid" : paid > 0 ? "partially_paid" : overdue ? "overdue" : "sent",
          lines,
          subtotal,
          taxPct: 12,
          total,
          paid,
          issuedISO: iso(nowMs, ageH + 26),
          dueISO: iso(nowMs, ageH + 26 + client.creditDays * 24),
          createdISO: iso(nowMs, ageH + 25),
          irn: i % 2 === 0 ? `8f9a2b1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e${(9000 + i).toString(16)}` : undefined,
          ackNo: i % 2 === 0 ? `1224${9012345000 + i}` : undefined,
          ackDateISO: i % 2 === 0 ? iso(nowMs, ageH + 26) : undefined,
          sacCode: "996511",
          rcm: false,
        };
        invoices.push(invoice);
        booking.invoiceId = invId;
        if (paid > 0) {
          payments.push({
            id: `pay_${i + 1}`,
            invoiceId: invId,
            clientId: client.id,
            amount: paid,
            mode: (["NEFT", "UPI", "Cheque", "Cash"] as const)[i % 4],
            reference: `TXN${480000 + i * 977}`,
            receivedISO: iso(nowMs, ageH + 40),
          });
        }
      }
    }

    bookings.push(booking);
  });

  const fuelLogs: FuelLog[] = [];
  for (let i = 0; i < 46; i++) {
    const v = vehicles[i % vehicles.length];
    const litres = 90 + Math.floor(r() * 190);
    fuelLogs.push({
      id: `fl_${i + 1}`,
      vehicleId: v.id,
      tripId: trips[i % trips.length]?.id,
      litres,
      cost: Math.round(litres * (92 + r() * 6)),
      odometerKm: v.odometerKm - Math.floor(r() * 9000),
      station: ["HP Highway Fuels", "IOCL Nashik Bypass", "BPCL Solapur Road", "Reliance Expressway"][i % 4],
      atISO: iso(nowMs, -(4 + i * 9)),
    });
  }

  const jobCards: JobCard[] = [
    { id: "jc_1", ref: "JC-3001", vehicleId: vehicles[4].id, issue: "Air brake pressure drop", status: "in_progress", partsCost: 14500, labourCost: 4200, openedISO: iso(nowMs, -52) },
    { id: "jc_2", ref: "JC-3002", vehicleId: vehicles[11].id, issue: "Clutch plate replacement", status: "parts_required", partsCost: 22800, labourCost: 6000, openedISO: iso(nowMs, -30) },
    { id: "jc_3", ref: "JC-3003", vehicleId: vehicles[2].id, issue: "Scheduled 40k service", status: "released", partsCost: 9100, labourCost: 3200, openedISO: iso(nowMs, -400), closedISO: iso(nowMs, -380) },
    { id: "jc_4", ref: "JC-3004", vehicleId: vehicles[7].id, issue: "Tyre rotation + alignment", status: "completed", partsCost: 4300, labourCost: 1500, openedISO: iso(nowMs, -120), closedISO: iso(nowMs, -100) },
    { id: "jc_5", ref: "JC-3005", vehicleId: vehicles[16].id, issue: "Engine overhaul assessment", status: "reported", partsCost: 0, labourCost: 0, openedISO: iso(nowMs, -8) },
  ];

  const docs: ComplianceDoc[] = [];
  const kinds = ["Registration (RC)", "Fitness Certificate", "Insurance", "National Permit", "PUC"];
  vehicles.forEach((v, i) => {
    kinds.forEach((kind, k) => {
      const days = [420, 200, 22, 5, -14][(i + k) % 5];
      docs.push({
        id: `doc_v${i}_${k}`,
        entityType: "vehicle",
        entityId: v.id,
        kind,
        number: `${kind.slice(0, 3).toUpperCase()}-${90000 + i * 71 + k}`,
        expiryISO: iso(nowMs, days * 24),
        status: days < 0 ? "expired" : days <= 30 ? "expiring" : "valid",
      });
    });
  });
  drivers.forEach((d, i) => {
    const days = i % 5 === 3 ? -20 : 90 + i * 40;
    docs.push({
      id: `doc_d${i}`,
      entityType: "driver",
      entityId: d.id,
      kind: "Driving Licence",
      number: d.licenceNo,
      expiryISO: d.licenceExpiryISO,
      status: days < 0 ? "expired" : days <= 30 ? "expiring" : "valid",
    });
  });

  docs
    .filter((d) => d.status !== "valid")
    .slice(0, 8)
    .forEach((d, i) => {
      notifications.push({
        id: `nt_doc${i}`,
        event: "DOCUMENT_EXPIRING",
        channel: "in_app",
        recipient: "Compliance desk",
        recipientRole: "manager",
        body: `${d.kind} ${d.number} is ${d.status === "expired" ? "expired" : "expiring soon"}.`,
        status: "delivered",
        attempts: 1,
        atISO: iso(nowMs, -(2 + i * 5)),
        link: "/app/compliance",
        entityRef: d.number,
      });
    });

  trips
    .filter((t) => t.delayMins > 0)
    .forEach((t, i) => {
      notifications.push({
        id: `nt_delay${i}`,
        event: "TRIP_DELAYED",
        channel: "whatsapp",
        recipient: clients[i % clients.length].phone,
        recipientRole: "client",
        body: `Trip ${t.ref} is running ${t.delayMins} minutes late. Updated ETA shared.`,
        status: i % 7 === 0 ? "failed" : "delivered",
        attempts: i % 7 === 0 ? 3 : 1,
        atISO: iso(nowMs, -(1 + i)),
        link: `/app/trips/${t.id}`,
        entityRef: t.ref,
      });
    });

  notifications.sort((x, y) => (x.atISO < y.atISO ? 1 : -1));

  return {
    tenant,
    branches,
    vehicles,
    drivers,
    clients,
    rateCards,
    bookings,
    trips,
    pods,
    invoices,
    payments,
    fuelLogs,
    jobCards,
    docs,
    notifications,
    audit: [
      {
        id: "au_0",
        actor: "System",
        action: "Seeded demo operations dataset",
        entity: "tenant",
        entityId: T,
        atISO: iso(nowMs, -1),
      },
    ],
  };
}
