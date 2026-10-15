import React from 'react';
import { OperationsWorkbench, OperationForm, OperationTable } from '../operations/OperationsWorkbench';

const tabs = [
  'Vehicle Fleet Registry',
  'Routes & Stops',
  'Student Assignments',
  'Maintenance & Fleet Logs'
];

const forms: OperationForm[] = [
  // --- TAB: Vehicle Fleet Registry ---
  {
    title: 'Register fleet vehicle',
    tab: 'Vehicle Fleet Registry',
    path: '/vehicles',
    permission: 'transport.manage',
    fields: [
      { name: 'registrationNumber', label: 'Registration number' },
      { name: 'vehicleType', label: 'Vehicle type (e.g. Bus, Van, Minibus)' },
      { name: 'capacity', label: 'Passenger capacity (seats)', type: 'number', min: 1, max: 500 },
      { name: 'makeModel', label: 'Make & Model (e.g. Tata Starbus 40S)', optional: true },
      { name: 'ownershipType', label: 'Ownership model', type: 'select', options: ['OWNED', 'LEASED', 'CONTRACTED'] },
      { name: 'driverId', label: 'Assigned staff driver', type: 'select', source: 'staff', optional: true },
      { name: 'currentOdometer', label: 'Current odometer reading (km)', type: 'number', min: 0, optional: true },
      { name: 'insuranceUntil', label: 'Insurance expiry', type: 'date', optional: true },
      { name: 'permitUntil', label: 'Permit expiry', type: 'date', optional: true },
      { name: 'fitnessUntil', label: 'Fitness certificate expiry', type: 'date', optional: true },
      { name: 'pollutionUntil', label: 'Pollution certificate expiry', type: 'date', optional: true },
      { name: 'branchId', label: 'Assigned branch', type: 'select', source: 'branches', optional: true }
    ],
    transform: (b: any) => ({
      ...b,
      capacity: Number(b.capacity),
      currentOdometer: b.currentOdometer !== undefined ? Number(b.currentOdometer) : 0
    })
  },
  {
    title: 'Update vehicle specifications and status',
    tab: 'Vehicle Fleet Registry',
    path: (b: any) => `/vehicles/${b.id}`,
    method: 'PATCH',
    permission: 'transport.manage',
    fields: [
      { name: 'id', label: 'Vehicle', type: 'select', source: 'vehicles', filter: (v: any) => v.status !== 'RETIRED' },
      { name: 'capacity', label: 'Capacity (seats)', type: 'number', min: 1, max: 500, optional: true },
      { name: 'status', label: 'Fleet status', type: 'select', options: ['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'INACTIVE', 'RETIRED'], optional: true },
      { name: 'currentOdometer', label: 'Updated odometer (km)', type: 'number', min: 0, optional: true },
      { name: 'insuranceUntil', label: 'Insurance expiry', type: 'date', optional: true },
      { name: 'permitUntil', label: 'Permit expiry', type: 'date', optional: true },
      { name: 'fitnessUntil', label: 'Fitness certificate expiry', type: 'date', optional: true }
    ],
    transform: (b: any) => ({
      ...b,
      capacity: b.capacity !== undefined ? Number(b.capacity) : undefined,
      currentOdometer: b.currentOdometer !== undefined ? Number(b.currentOdometer) : undefined
    })
  },
  {
    title: 'Assign driver to vehicle (Active Roster)',
    tab: 'Vehicle Fleet Registry',
    path: '/drivers/assign',
    permission: 'transport.assign',
    fields: [
      { name: 'vehicleId', label: 'Vehicle', type: 'select', source: 'vehicles', filter: (v: any) => v.status === 'ACTIVE' },
      { name: 'driverId', label: 'Staff driver', type: 'select', source: 'staff' },
      { name: 'licenseNumber', label: 'Driving license number', optional: true },
      { name: 'licenseExpiry', label: 'License expiry date', type: 'date', optional: true },
      { name: 'startDate', label: 'Assignment start date', type: 'date', optional: true }
    ]
  },

  // --- TAB: Routes & Stops ---
  {
    title: 'Add transport route',
    tab: 'Routes & Stops',
    path: '/routes',
    permission: 'transport.manage',
    fields: [
      { name: 'name', label: 'Route name (e.g. Route 4 — North Campus)' },
      { name: 'routeCode', label: 'Route code / identifier', optional: true },
      { name: 'vehicleId', label: 'Designated vehicle', type: 'select', source: 'vehicles', filter: (v: any) => v.status === 'ACTIVE' },
      { name: 'direction', label: 'Service direction', type: 'select', options: ['TWO_WAY', 'PICKUP', 'DROP'] },
      { name: 'branchId', label: 'Branch', type: 'select', source: 'branches', optional: true }
    ]
  },
  {
    title: 'Update route vehicle and status',
    tab: 'Routes & Stops',
    path: (b: any) => `/routes/${b.id}`,
    method: 'PATCH',
    permission: 'transport.manage',
    fields: [
      { name: 'id', label: 'Route', type: 'select', source: 'routes' },
      { name: 'vehicleId', label: 'Vehicle', type: 'select', source: 'vehicles', filter: (v: any) => v.status === 'ACTIVE', optional: true },
      { name: 'status', label: 'Operational status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], optional: true },
      { name: 'direction', label: 'Service direction', type: 'select', options: ['TWO_WAY', 'PICKUP', 'DROP'], optional: true }
    ]
  },
  {
    title: 'Add ordered route stop',
    tab: 'Routes & Stops',
    path: '/stops',
    permission: 'transport.manage',
    fields: [
      { name: 'routeId', label: 'Route', type: 'select', source: 'routes', filter: (r: any) => r.status === 'ACTIVE' },
      { name: 'name', label: 'Stop name / junction / landmark' },
      { name: 'sequence', label: 'Stop order sequence (1, 2, 3...)', type: 'number', min: 1 }
    ],
    transform: (b: any) => ({ ...b, sequence: Number(b.sequence) })
  },

  // --- TAB: Student Assignments ---
  {
    title: 'Assign student to transport route',
    tab: 'Student Assignments',
    path: '/assignments',
    permission: 'transport.assign',
    fields: [
      { name: 'enrollmentId', label: 'Enrolled student', type: 'select', source: 'enrollments' },
      { name: 'routeId', label: 'Active route', type: 'select', source: 'routes', filter: (r: any) => r.status === 'ACTIVE' },
      { name: 'stopId', label: 'Pickup / drop stop', type: 'select', source: 'stops' }
    ]
  },

  // --- TAB: Maintenance & Fleet Logs ---
  {
    title: 'Dispatch vehicle for maintenance / service',
    tab: 'Maintenance & Fleet Logs',
    path: '/maintenance',
    permission: 'transport.maintenance',
    fields: [
      { name: 'vehicleId', label: 'Vehicle', type: 'select', source: 'vehicles', filter: (v: any) => v.status !== 'RETIRED' && v.status !== 'UNDER_MAINTENANCE' && v.occupancy === 0 },
      { name: 'maintenanceType', label: 'Maintenance type', type: 'select', options: ['ROUTINE_SERVICE', 'MAJOR_REPAIR', 'TYRE_REPLACEMENT', 'BATTERY', 'INSPECTION', 'EMERGENCY'] },
      { name: 'odometerAtService', label: 'Odometer at service (km)', type: 'number', min: 0 },
      { name: 'vendorWorkshop', label: 'Workshop / service garage', optional: true },
      { name: 'notes', label: 'Service requisition notes', optional: true }
    ],
    transform: (b: any) => ({ ...b, odometerAtService: Number(b.odometerAtService) })
  },
  {
    title: 'Complete vehicle maintenance',
    tab: 'Maintenance & Fleet Logs',
    path: (b: any) => `/maintenance/${b.id}/complete`,
    method: 'POST',
    permission: 'transport.maintenance',
    fields: [
      { name: 'id', label: 'Active maintenance work order', type: 'select', source: 'maintenance', filter: (m: any) => m.status === 'IN_PROGRESS' },
      { name: 'outcome', label: 'Service completion summary / technician signoff' },
      { name: 'cost', label: 'Maintenance invoice cost', type: 'number', min: 0, optional: true },
      { name: 'nextServiceDate', label: 'Next scheduled service date', type: 'date', optional: true },
      { name: 'nextServiceOdometer', label: 'Next service odometer target (km)', type: 'number', min: 0, optional: true }
    ],
    transform: (b: any) => ({
      outcome: b.outcome,
      cost: b.cost !== undefined ? Number(b.cost) : 0,
      nextServiceDate: b.nextServiceDate || null,
      nextServiceOdometer: b.nextServiceOdometer !== undefined ? Number(b.nextServiceOdometer) : null
    })
  },
  {
    title: 'Log operational trip',
    tab: 'Maintenance & Fleet Logs',
    path: '/trips',
    permission: 'transport.trip.manage',
    fields: [
      { name: 'vehicleId', label: 'Vehicle', type: 'select', source: 'vehicles', filter: (v: any) => v.status === 'ACTIVE' },
      { name: 'driverId', label: 'Operating driver', type: 'select', source: 'staff' },
      { name: 'routeId', label: 'Route covered', type: 'select', source: 'routes', optional: true },
      { name: 'startOdometer', label: 'Starting odometer (km)', type: 'number', min: 0 },
      { name: 'endOdometer', label: 'Ending odometer (km)', type: 'number', min: 0, optional: true },
      { name: 'tripDate', label: 'Trip date', type: 'date', optional: true },
      { name: 'notes', label: 'Trip notes / route observations', optional: true }
    ],
    transform: (b: any) => ({
      ...b,
      startOdometer: Number(b.startOdometer),
      endOdometer: b.endOdometer !== undefined ? Number(b.endOdometer) : null
    })
  },
  {
    title: 'Log fuel purchase',
    tab: 'Maintenance & Fleet Logs',
    path: '/fuel',
    permission: 'transport.trip.manage',
    fields: [
      { name: 'vehicleId', label: 'Vehicle', type: 'select', source: 'vehicles', filter: (v: any) => v.status !== 'RETIRED' },
      { name: 'quantity', label: 'Fuel quantity (liters)', type: 'number', min: 1 },
      { name: 'cost', label: 'Total fuel cost', type: 'number', min: 0 },
      { name: 'odometerReading', label: 'Odometer at fueling (km)', type: 'number', min: 0 },
      { name: 'vendorSource', label: 'Fuel station / vendor', optional: true },
      { name: 'fuelDate', label: 'Date of purchase', type: 'date', optional: true },
      { name: 'notes', label: 'Receipt number / fuel notes', optional: true }
    ],
    transform: (b: any) => ({
      ...b,
      quantity: Number(b.quantity),
      cost: Number(b.cost),
      odometerReading: Number(b.odometerReading)
    })
  }
];

const tables: OperationTable[] = [
  // --- TAB: Vehicle Fleet Registry ---
  {
    title: 'Vehicle Fleet & Real-time Occupancy',
    tab: 'Vehicle Fleet Registry',
    source: 'vehicles',
    columns: {
      registration_number: 'Registration',
      vehicle_type: 'Type',
      make_model: 'Make/Model',
      capacity: 'Total Seats',
      occupancy: 'Occupied Seats',
      driver_name: 'Assigned Driver',
      current_odometer: 'Odometer (km)',
      status: 'Fleet Status',
      insurance_until: 'Insurance Expiry',
      fitness_until: 'Fitness Expiry'
    },
    action: {
      label: 'Retire Vehicle',
      permission: 'transport.manage',
      method: 'PATCH',
      path: (r: any) => `/vehicles/${r.id}`,
      body: () => ({ status: 'RETIRED' }),
      show: (r: any) => r.status !== 'RETIRED' && r.occupancy === 0
    }
  },
  {
    title: 'Active Staff Driver Roster',
    tab: 'Vehicle Fleet Registry',
    source: 'driverAssignments',
    columns: {
      vehicle_number: 'Vehicle',
      driver_name: 'Driver',
      license_number: 'License No',
      license_expiry: 'License Expiry',
      start_date: 'Assignment Date',
      status: 'Status'
    },
    action: {
      label: 'End Assignment',
      permission: 'transport.assign',
      path: (r: any) => `/drivers/${r.id}/end`,
      show: (r: any) => r.status === 'ACTIVE'
    }
  },

  // --- TAB: Routes & Stops ---
  {
    title: 'Transport Routes & Operational Status',
    tab: 'Routes & Stops',
    source: 'routes',
    columns: {
      name: 'Route Name',
      route_code: 'Code',
      vehicle: 'Vehicle',
      direction: 'Direction',
      occupants: 'Assigned Students',
      stops_count: 'Stops',
      status: 'Status'
    },
    action: {
      label: 'Archive Route',
      permission: 'transport.manage',
      method: 'PATCH',
      path: (r: any) => `/routes/${r.id}`,
      body: () => ({ status: 'ARCHIVED' }),
      show: (r: any) => r.status !== 'ARCHIVED' && r.occupants === 0
    }
  },
  {
    title: 'Ordered Route Stops',
    tab: 'Routes & Stops',
    source: 'stops',
    columns: {
      route_name: 'Route',
      name: 'Stop Name',
      sequence: 'Order Sequence'
    }
  },

  // --- TAB: Student Assignments ---
  {
    title: 'Active Student Transport Roster',
    tab: 'Student Assignments',
    source: 'assignments',
    columns: {
      student_name: 'Student Name',
      admission_no: 'Admission No',
      route_name: 'Route',
      stop_name: 'Designated Stop',
      assigned_at: 'Assignment Date',
      ended_at: 'Ended Date'
    },
    action: {
      label: 'End Transport',
      permission: 'transport.assign',
      path: (r: any) => `/assignments/${r.id}/end`,
      show: (r: any) => !r.ended_at
    }
  },

  // --- TAB: Maintenance & Fleet Logs ---
  {
    title: 'Fleet Maintenance Work Orders',
    tab: 'Maintenance & Fleet Logs',
    source: 'maintenance',
    columns: {
      vehicle_number: 'Vehicle',
      maintenance_type: 'Service Type',
      odometer_at_service: 'Odometer (km)',
      status: 'Status',
      vendor_workshop: 'Workshop',
      cost: 'Cost',
      start_date: 'Start Date',
      completion_date: 'Completed Date',
      notes: 'Details / Outcome'
    }
  },
  {
    title: 'Trip History',
    tab: 'Maintenance & Fleet Logs',
    source: 'trips',
    columns: {
      vehicle_number: 'Vehicle',
      driver_name: 'Driver',
      route_name: 'Route',
      trip_date: 'Date',
      start_odometer: 'Start Odo',
      end_odometer: 'End Odo',
      status: 'Status',
      notes: 'Notes'
    }
  },
  {
    title: 'Fuel Consumption Records',
    tab: 'Maintenance & Fleet Logs',
    source: 'fuel',
    columns: {
      vehicle_number: 'Vehicle',
      fuel_date: 'Date',
      quantity: 'Quantity (L)',
      cost: 'Cost',
      odometer_reading: 'Odometer (km)',
      vendor_source: 'Fuel Station',
      notes: 'Notes'
    }
  }
];

export const TransportOperationsModule: React.FC = () => (
  <OperationsWorkbench
    title="Transport & Fleet Management"
    module="transport"
    tabs={tabs}
    forms={forms}
    tables={tables}
    note="Fleet capacity is strictly enforced across all routes sharing a vehicle. Vehicles under maintenance or without an active staff driver cannot receive new student assignments."
  />
);
