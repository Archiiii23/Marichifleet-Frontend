import { initialSeedData, SeedDataset } from './seeds/seedData.js';
import { v4 as uuidv4 } from 'uuid';

class TenantScopedStore {
  private data: SeedDataset;

  constructor() {
    // Deep clone initial seed data
    this.data = JSON.parse(JSON.stringify(initialSeedData));
  }

  // Generic collection accessor partitioned strictly by tenantId (Law 3)
  private getTenantCollection(collectionName: keyof SeedDataset, tenantId: string): any[] {
    const list = this.data[collectionName] as any[];
    return list.filter((item) => item.tenantId === tenantId);
  }

  // --- TRIPS ---
  getTrips(tenantId: string, filters?: { status?: string; vehicleRegNumber?: string }): any[] {
    let items = this.getTenantCollection('trips', tenantId);
    if (filters?.status) {
      items = items.filter((t) => t.status === filters.status);
    }
    if (filters?.vehicleRegNumber) {
      items = items.filter((t) => t.vehicleRegNumber === filters.vehicleRegNumber);
    }
    return items;
  }

  getTripById(tenantId: string, id: string): any | null {
    const trip = this.data.trips.find((t) => t.tenantId === tenantId && t.id === id);
    return trip ? { ...trip } : null;
  }

  createTrip(tenantId: string, tripPayload: Partial<any>): any {
    const newTrip = {
      id: `TRP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      tenantId,
      status: 'DISPATCHED',
      slaStatus: 'ON_TIME',
      completedDistanceKm: 0,
      detentionAccrued: 0,
      checkpoints: [],
      ...tripPayload,
      createdAt: new Date().toISOString(),
    };
    this.data.trips.unshift(newTrip);
    return newTrip;
  }

  updateTrip(tenantId: string, id: string, patch: Partial<any>): any | null {
    const idx = this.data.trips.findIndex((t) => t.tenantId === tenantId && t.id === id);
    if (idx === -1) return null;
    this.data.trips[idx] = {
      ...this.data.trips[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return this.data.trips[idx];
  }

  // --- VEHICLES ---
  getVehicles(tenantId: string, status?: string): any[] {
    let items = this.getTenantCollection('vehicles', tenantId);
    if (status) items = items.filter((v) => v.status === status);
    return items;
  }

  getVehicleById(tenantId: string, id: string): any | null {
    const v = this.data.vehicles.find((item) => item.tenantId === tenantId && (item.id === id || item.regNumber === id));
    return v ? { ...v } : null;
  }

  updateVehicleLocation(tenantId: string, vehicleId: string, loc: any): any | null {
    const v = this.data.vehicles.find((item) => item.tenantId === tenantId && (item.id === vehicleId || item.regNumber === vehicleId));
    if (!v) return null;
    v.currentLocation = { ...v.currentLocation, ...loc, updatedAt: new Date().toISOString() };
    return v;
  }

  createVehicle(tenantId: string, vehicleData: any): any {
    const cleanReg = vehicleData.regNumber?.trim().toUpperCase().replace(/\s+/g, '') || `DL${Math.floor(10 + Math.random() * 89)}AA${Math.floor(1000 + Math.random() * 9000)}`;
    const newVehicle = {
      id: `veh_${uuidv4().slice(0, 8)}`,
      tenantId,
      regNumber: cleanReg,
      model: vehicleData.model || 'Tata Prima 5530.S',
      capacityTons: Number(vehicleData.capacityTons) || 28,
      type: vehicleData.type || 'CONTAINER_CLOSED',
      status: 'AVAILABLE',
      currentLocation: {
        latitude: 28.5355,
        longitude: 77.2731,
        address: 'Delhi NCR Depot',
        speedKmH: 0,
        bearing: 0,
        updatedAt: new Date().toISOString(),
      },
      fuelLevelPercent: Number(vehicleData.fuelLevelPercent) || 85,
      batteryVolts: 24.5,
      odometerKm: Number(vehicleData.odometerKm) || 0,
      assignedDriverId: vehicleData.assignedDriverId || null,
      currentTripId: null,
      documents: {
        rcValidUntil: vehicleData.rcValidUntil || '2028-12-31',
        fitnessValidUntil: vehicleData.fitnessValidUntil || '2027-12-31',
        insuranceValidUntil: vehicleData.insuranceValidUntil || '2026-12-31',
        pucValidUntil: vehicleData.pucValidUntil || '2026-10-30',
      },
      createdAt: new Date().toISOString(),
    };
    this.data.vehicles.unshift(newVehicle);
    return newVehicle;
  }

  // --- DRIVERS ---
  getDrivers(tenantId: string): any[] {
    return this.getTenantCollection('drivers', tenantId);
  }

  getDriverById(tenantId: string, id: string): any | null {
    return this.data.drivers.find((d) => d.tenantId === tenantId && d.id === id) || null;
  }

  createDriver(tenantId: string, driverData: any): any {
    const newDriver = {
      id: `drv_${uuidv4().slice(0, 8)}`,
      tenantId,
      name: driverData.name?.trim() || 'New Driver',
      phone: driverData.phone?.trim() || '+91 98110 00000',
      licenseNumber: driverData.licenseNumber?.trim().toUpperCase() || `DL-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      licenseValidUntil: driverData.licenseValidUntil || '2031-12-31',
      status: 'AVAILABLE',
      currentTripId: null,
      rating: 5.0,
      totalTripsCompleted: 0,
      aadhaarLast4: driverData.aadhaarLast4 || '0000',
      settlementPendingAmount: 0,
      createdAt: new Date().toISOString(),
    };
    this.data.drivers.unshift(newDriver);
    return newDriver;
  }

  // --- BOOKINGS ---
  getBookings(tenantId: string): any[] {
    return this.getTenantCollection('bookings', tenantId);
  }

  createBooking(tenantId: string, bookingData: any): any {
    const newBooking = {
      id: `BKG-${Math.floor(10000 + Math.random() * 90000)}`,
      tenantId,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      ...bookingData,
    };
    this.data.bookings.unshift(newBooking);
    return newBooking;
  }

  // --- INVOICES ---
  getInvoices(tenantId: string, status?: string): any[] {
    let items = this.getTenantCollection('invoices', tenantId);
    if (status) items = items.filter((i) => i.status === status);
    return items;
  }

  getInvoiceById(tenantId: string, id: string): any | null {
    return this.data.invoices.find((i) => i.tenantId === tenantId && i.id === id) || null;
  }

  createInvoice(tenantId: string, invData: any): any {
    const id = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInv = {
      id,
      tenantId,
      status: 'DRAFT',
      sacCode: '996511',
      issuedDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      dsoDays: 0,
      ...invData,
    };
    this.data.invoices.unshift(newInv);
    return newInv;
  }

  finaliseInvoice(tenantId: string, id: string): any | null {
    const inv = this.data.invoices.find((i) => i.tenantId === tenantId && i.id === id);
    if (!inv) return null;
    // Generate 64-char IRN and QR code
    const irnChars = '0123456789abcdef';
    let mockIrn = '';
    for (let i = 0; i < 64; i++) {
      mockIrn += irnChars.charAt(Math.floor(Math.random() * irnChars.length));
    }
    inv.status = 'FINALISED';
    inv.irn = mockIrn;
    inv.qrCodeData = `IRN:${mockIrn.slice(0, 16)}|GSTIN:${tenantId}|INV:${inv.id}|TOTAL:${inv.totalAmount}`;
    inv.finalisedAt = new Date().toISOString();

    // Auto append to double-entry general ledger (Law 5)
    this.appendLedgerEntry(tenantId, {
      referenceId: inv.id,
      referenceType: 'INVOICE',
      debitAccount: '1100-Trade-Receivables',
      creditAccount: '4100-Freight-Revenue',
      amount: inv.taxableAmount,
      narration: `Billed freight revenue for ${inv.clientName} under SAC 996511`,
    });

    if (inv.cgstAmount + inv.sgstAmount + (inv.igstAmount || 0) > 0) {
      this.appendLedgerEntry(tenantId, {
        referenceId: inv.id,
        referenceType: 'INVOICE',
        debitAccount: '1100-Trade-Receivables',
        creditAccount: '2200-GST-Output-Liability',
        amount: inv.cgstAmount + inv.sgstAmount + (inv.igstAmount || 0),
        narration: `GST output tax liability on invoice ${inv.id}`,
      });
    }

    return inv;
  }

  // --- LEDGER (Append-Only Law 5) ---
  getLedgerEntries(tenantId: string): any[] {
    return this.getTenantCollection('ledgerEntries', tenantId);
  }

  appendLedgerEntry(tenantId: string, entry: any): any {
    const newEntry = {
      id: `led_${uuidv4().slice(0, 8)}`,
      tenantId,
      transactionDate: new Date().toISOString(),
      ...entry,
    };
    this.data.ledgerEntries.push(newEntry);
    return newEntry;
  }

  // --- CONTROL TOWER EXCEPTIONS ---
  getExceptions(tenantId: string, status?: string): any[] {
    let items = this.getTenantCollection('exceptions', tenantId);
    if (status) items = items.filter((e) => e.status === status);
    return items;
  }

  resolveException(tenantId: string, id: string, resolutionNote: string): any | null {
    const exc = this.data.exceptions.find((e) => e.tenantId === tenantId && e.id === id);
    if (!exc) return null;
    exc.status = 'RESOLVED';
    exc.resolvedAt = new Date().toISOString();
    exc.resolutionNote = resolutionNote;
    return exc;
  }

  // --- APPROVALS INBOX ---
  getApprovals(tenantId: string, filters?: { status?: string; department?: string; category?: string }): any[] {
    let items = this.getTenantCollection('approvals', tenantId);
    if (filters?.status) items = items.filter((a) => a.status === filters.status);
    if (filters?.department) items = items.filter((a) => a.department === filters.department);
    if (filters?.category) items = items.filter((a) => a.category === filters.category);
    return items;
  }

  createApproval(tenantId: string, approvalData: any): any {
    const newApproval = {
      id: `appr_${uuidv4().slice(0, 8)}`,
      tenantId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      ...approvalData,
    };
    this.data.approvals.unshift(newApproval);
    return newApproval;
  }

  decideApproval(tenantId: string, id: string, decision: 'APPROVED' | 'REJECTED', decidedBy: string, comment?: string): any | null {
    const item = this.data.approvals.find((a) => a.tenantId === tenantId && a.id === id);
    if (!item) return null;
    item.status = decision;
    item.decidedBy = decidedBy;
    item.decisionComment = comment || null;
    item.decidedAt = new Date().toISOString();

    // Automated Feedback Loop: Trigger confirmation message back to Driver over WhatsApp
    if (item.driverPhone || item.requestedBy?.includes('Driver')) {
      const phone = item.driverPhone || '+91 98110 23456';
      const driverName = item.requestedBy?.split(' ')[0] || 'Driver';
      let confirmText = '';

      if (decision === 'APPROVED') {
        if (item.category === 'FUEL_REFILL') {
          confirmText = `✅ Theek hai ${driverName} bhai, aapka Diesel Bill (INR ${item.amount?.toLocaleString('en-IN')}) ${item.department} dwara APPROVE ho gaya hai. Aap aage badh sakte hain. [You are good to go!]`;
          // Also update vehicle fuel and trip cost
          if (item.vehicleRegNumber) {
            const v = this.getVehicleById(tenantId, item.vehicleRegNumber);
            if (v) v.fuelLevelPercent = Math.min(100, (v.fuelLevelPercent || 50) + 35);
          }
        } else if (item.category === 'CASH_ADVANCE') {
          confirmText = `✅ Cash Advance INR ${item.amount?.toLocaleString('en-IN')} approved by Finance. Account me transfer ho gaya hai.`;
        } else {
          confirmText = `✅ Request '${item.title}' approved by ${item.department}. Confirmation ref: ${item.id}.`;
        }
      } else {
        confirmText = `❌ Update: Request '${item.title}' was rejected by ${item.department}. Reason: ${comment || 'Budget restriction'}. Kripya manager se sampark karein.`;
      }

      this.addWhatsAppMessage(tenantId, {
        sender: 'SYSTEM',
        recipient: phone,
        content: confirmText,
        timestamp: new Date().toISOString(),
        type: 'APPROVAL_CONFIRMATION',
      });
    }

    return item;
  }

  // --- WHATSAPP CONVERSATIONS & AUTOMATION ---
  getWhatsAppMessages(tenantId: string, phone?: string): any[] {
    let list = this.data.whatsappMessages.filter((m) => m.tenantId === tenantId);
    if (phone) {
      list = list.filter((m) => m.recipient === phone || m.senderPhone === phone);
    }
    return list;
  }

  addWhatsAppMessage(tenantId: string, msg: any): any {
    const newMsg = {
      id: `msg_${uuidv4().slice(0, 8)}`,
      tenantId,
      timestamp: new Date().toISOString(),
      ...msg,
    };
    this.data.whatsappMessages.push(newMsg);
    return newMsg;
  }

  // OCR Bill Extraction Engine (simulates high-accuracy fuel bill vision parser)
  parseFuelBillOcr(imageUrl?: string, overrides?: any) {
    const samplePumps = [
      'HPCL Highway Oasis, NH-48 Km 142 Kotputli',
      'IndianOil COCO Plaza, Express Highway Vadodara',
      'Bharat Petroleum Ghar Outlet, NH-44 Davanagere',
      'Reliance Petroleum Hub, Ashta Bypass',
    ];
    const pump = overrides?.pumpName || samplePumps[Math.floor(Math.random() * samplePumps.length)];
    const volume = overrides?.volumeLitres || Number((45 + Math.random() * 30).toFixed(2));
    const rate = overrides?.ratePerLitre || 89.50;
    const amount = Number((volume * rate).toFixed(2));
    const slipNumber = overrides?.slipNumber || `HP-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      confidence: 0.96,
      extracted: {
        pumpName: pump,
        volumeLitres: volume,
        ratePerLitre: rate,
        totalAmount: amount,
        slipNumber: slipNumber,
        fuelType: 'DIESEL (HSD BS-VI)',
        timestamp: new Date().toISOString(),
        receiptUrl: imageUrl || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
        geoCheckPassed: true,
      },
    };
  }

  // --- WHATSAPP LIVE LOCATION TRACKING ---
  getLiveLocations(tenantId: string): any[] {
    return this.data.liveLocations;
  }

  updateLiveLocation(tenantId: string, vehicleRegNumber: string, locData: any): any {
    let loc = this.data.liveLocations.find((l) => l.vehicleRegNumber === vehicleRegNumber);
    if (!loc) {
      loc = {
        vehicleRegNumber,
        driverPhone: '+91 98110 23456',
        driverName: 'Driver',
        isLive: true,
        isDropped: false,
        source: 'WHATSAPP_LIVE_LOCATION',
        ...locData,
      };
      this.data.liveLocations.push(loc);
    } else {
      Object.assign(loc, locData, {
        isDropped: false,
        lastPing: new Date().toISOString(),
      });
    }

    // Sync to vehicle in fleet
    const vehicle = this.getVehicleById(tenantId, vehicleRegNumber);
    if (vehicle) {
      vehicle.currentLocation = {
        ...vehicle.currentLocation,
        latitude: loc.latitude,
        longitude: loc.longitude,
        speedKmH: loc.speedKmH ?? vehicle.currentLocation?.speedKmH ?? 55,
        updatedAt: new Date().toISOString(),
      };
    }

    return loc;
  }

  simulateLocationDrop(tenantId: string, vehicleRegNumber: string): any {
    const loc = this.data.liveLocations.find((l) => l.vehicleRegNumber === vehicleRegNumber);
    if (loc) {
      loc.isLive = false;
      loc.isDropped = true;
      loc.droppedAt = new Date().toISOString();

      // Trigger automated WhatsApp message to driver asking him to resend
      const phone = loc.driverPhone || '+91 98110 23456';
      const promptMsg = `⚠️ ALERT: Ramesh bhai, aapki WhatsApp Live Location signal drop ho gayi hai (> 15 min no ping). Kripya chat me jakar "Share Live Location" (8 Hours) dobara share karein taaki truck tracking sync rahe.`;
      
      this.addWhatsAppMessage(tenantId, {
        sender: 'SYSTEM',
        recipient: phone,
        content: promptMsg,
        type: 'LOCATION_DROP_ALERT',
        timestamp: new Date().toISOString(),
      });

      // Also create an exception in Control Tower
      this.data.exceptions.unshift({
        id: `exc_${uuidv4().slice(0, 8)}`,
        tenantId,
        vehicleRegNumber,
        type: 'WHATSAPP_LOCATION_DROPPED',
        severity: 'HIGH',
        description: `Live location stream stopped for vehicle ${vehicleRegNumber}. Automated prompt sent to driver phone ${phone}.`,
        timestamp: new Date().toISOString(),
        status: 'OPEN',
      });
    }
    return loc;
  }
}


export const store = new TenantScopedStore();
