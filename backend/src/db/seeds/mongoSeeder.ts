import {
  UserModel,
  VehicleModel,
  DriverModel,
  TripModel,
  BookingModel,
  InvoiceModel,
  ApprovalModel,
} from '../models/index.js';
import { initialSeedData } from './seedData.js';
import { logger } from '../../platform/logger.js';

export async function seedMongoDatabase() {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      logger.info('🌱 Empty MongoDB detected. Pre-populating with transport seed dataset...');

      // 1. Users
      await UserModel.insertMany(
        initialSeedData.users.map((u) => ({
          userId: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          tenantId: u.tenantId,
          branches: u.branches,
          permissions: ['*'],
          authProvider: 'local',
        }))
      );

      // 2. Vehicles
      await VehicleModel.insertMany(
        initialSeedData.vehicles.map((v) => ({
          id: v.id,
          tenantId: v.tenantId,
          regNumber: v.regNumber,
          model: v.model,
          capacityTons: v.capacityTons,
          type: v.type,
          status: v.status,
          fuelLevelPercent: v.fuelLevelPercent,
          batteryVolts: v.batteryVolts,
          odometerKm: v.odometerKm,
          assignedDriverId: v.assignedDriverId,
          currentTripId: v.currentTripId,
          currentLocation: v.currentLocation,
          documents: v.documents,
        }))
      );

      // 3. Drivers
      await DriverModel.insertMany(
        initialSeedData.drivers.map((d) => ({
          id: d.id,
          tenantId: d.tenantId,
          name: d.name,
          phone: d.phone,
          licenseNumber: d.licenseNumber,
          licenseValidUntil: d.licenseValidUntil,
          status: d.status,
          currentTripId: d.currentTripId,
          rating: d.rating,
          totalTripsCompleted: d.totalTripsCompleted,
          aadhaarLast4: d.aadhaarLast4,
          settlementPendingAmount: d.settlementPendingAmount,
        }))
      );

      // 4. Trips
      await TripModel.insertMany(
        initialSeedData.trips.map((t) => ({
          id: t.id,
          tenantId: t.tenantId,
          bookingId: t.bookingId,
          clientName: t.clientName,
          origin: t.origin,
          destination: t.destination,
          vehicleRegNumber: t.vehicleRegNumber,
          driverId: t.driverId,
          driverName: t.driverName,
          driverPhone: t.driverPhone,
          cargoDescription: t.cargoDescription,
          weightTons: t.weightTons,
          totalDistanceKm: t.totalDistanceKm,
          completedDistanceKm: t.completedDistanceKm,
          status: t.status,
          slaStatus: t.slaStatus,
          eta: t.eta ? new Date(t.eta) : undefined,
          dispatchedAt: t.dispatchedAt ? new Date(t.dispatchedAt) : undefined,
          freightAmount: t.freightAmount,
          advancePaid: t.advancePaid,
          detentionAccrued: t.detentionAccrued,
          checkpoints: t.checkpoints?.map((c: any) => ({
            name: c.name,
            timestamp: c.timestamp ? new Date(c.timestamp) : undefined,
            status: c.status,
          })),
          ewayBillNumber: t.ewayBillNumber,
          ewayBillValidUntil: t.ewayBillValidUntil ? new Date(t.ewayBillValidUntil) : undefined,
        }))
      );

      // 5. Bookings
      await BookingModel.insertMany(
        initialSeedData.bookings.map((b) => ({
          id: b.id,
          tenantId: b.tenantId,
          clientName: b.clientName,
          pickupLocation: b.pickupLocation,
          deliveryLocation: b.deliveryLocation,
          expectedWeightTons: b.expectedWeightTons,
          vehicleTypeRequired: b.vehicleTypeRequired,
          quotedRate: b.quotedRate,
          status: b.status,
        }))
      );

      // 6. Invoices
      await InvoiceModel.insertMany(
        initialSeedData.invoices.map((inv) => ({
          id: inv.id,
          tenantId: inv.tenantId,
          tripId: inv.tripId,
          clientName: inv.clientName,
          clientGstin: inv.clientGstin,
          sacCode: inv.sacCode,
          freightAmount: inv.freightAmount,
          detentionAmount: inv.detentionAmount,
          taxableAmount: inv.taxableAmount,
          cgstAmount: inv.cgstAmount,
          sgstAmount: inv.sgstAmount,
          igstAmount: inv.igstAmount,
          totalAmount: inv.totalAmount,
          status: inv.status,
          irn: inv.irn,
          qrCodeData: inv.qrCodeData,
          issuedDate: new Date(inv.issuedDate),
          dueDate: new Date(inv.dueDate),
          paidAt: inv.paidAt ? new Date(inv.paidAt) : undefined,
          dsoDays: inv.dsoDays,
        }))
      );

      // 7. Approvals
      await ApprovalModel.insertMany(
        initialSeedData.approvals.map((appr) => ({
          id: appr.id,
          tenantId: appr.tenantId,
          department: appr.department || 'FINANCE',
          category: appr.category || 'GENERAL',
          title: appr.title,
          requestedBy: appr.requestedBy,
          driverPhone: appr.driverPhone,
          vehicleRegNumber: appr.vehicleRegNumber,
          tripId: appr.tripId,
          amount: appr.amount,
          fuelDetails: appr.fuelDetails,
          reason: appr.reason,
          status: appr.status,
        }))
      );

      logger.info('✅ Successfully seeded MongoDB with initial fleet, trips, invoices, and users.');
    }
  } catch (error) {
    logger.error({ err: error, msg: 'Error seeding MongoDB collections' });
  }
}
