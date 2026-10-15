import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { id, text, state, validateId, logOperation, operationError } from './operationsSupport.js';

const router = Router();
router.use(tenantContext(true));

const vehicleStatus = z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED', 'INACTIVE', 'ARCHIVED']);

// ---------------------------------------------------------------------------
// 1. GET /api/v1/transport - Consolidated Transport & Fleet Dataset & Reports
// ---------------------------------------------------------------------------
router.get('/', requirePermission('transport.view'), asyncHandler(async (req, res) => {
  const t = req.tenantId;
  const [
    vehiclesRes,
    routesRes,
    stopsRes,
    assignmentsRes,
    staffRes,
    enrollmentsRes,
    driverAssignmentsRes,
    maintenanceRes,
    tripsRes,
    fuelRes,
    branchesRes,
  ] = await Promise.all([
    query(`
      SELECT 
        v.*,
        v.registration_number AS name,
        s.name AS driver_name,
        b.name AS branch_name,
        (
          SELECT COUNT(*)::int 
          FROM student_transport_assignments a 
          JOIN transport_routes r ON r.id = a.route_id AND r.tenant_id = a.tenant_id 
          WHERE r.vehicle_id = v.id AND a.ended_at IS NULL
        ) AS occupancy
      FROM transport_vehicles v 
      LEFT JOIN staff s ON s.id = v.driver_id AND s.tenant_id = v.tenant_id 
      LEFT JOIN branches b ON b.id = v.branch_id AND b.tenant_id = v.tenant_id
      WHERE v.tenant_id = $1 
      ORDER BY v.registration_number
    `, [t]),
    query(`
      SELECT 
        r.id, 
        r.route_name AS name,
        r.route_code,
        r.direction,
        r.operational_status AS status, 
        r.vehicle_id, 
        v.registration_number AS vehicle,
        b.name AS branch_name,
        (
          SELECT COUNT(*)::int 
          FROM student_transport_assignments a 
          WHERE a.route_id = r.id AND a.ended_at IS NULL
        ) AS occupants,
        (
          SELECT COUNT(*)::int 
          FROM route_stops rs 
          WHERE rs.route_id = r.id
        ) AS stops_count
      FROM transport_routes r 
      LEFT JOIN transport_vehicles v ON v.id = r.vehicle_id AND v.tenant_id = r.tenant_id 
      LEFT JOIN branches b ON b.id = r.branch_id AND b.tenant_id = r.tenant_id
      WHERE r.tenant_id = $1 
      ORDER BY r.route_name
    `, [t]),
    query(`
      SELECT 
        s.*, 
        r.route_name AS route_name, 
        s.name || ' · ' || r.route_name AS name 
      FROM route_stops s 
      JOIN transport_routes r ON r.id = s.route_id AND r.tenant_id = s.tenant_id 
      WHERE s.tenant_id = $1 
      ORDER BY r.route_name, s.sequence
    `, [t]),
    query(`
      SELECT 
        a.*, 
        s.first_name || ' ' || s.last_name AS student_name, 
        s.admission_no,
        r.route_name, 
        st.name AS stop_name 
      FROM student_transport_assignments a 
      JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id 
      JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id 
      JOIN transport_routes r ON r.id = a.route_id AND r.tenant_id = a.tenant_id 
      JOIN route_stops st ON st.id = a.stop_id AND st.tenant_id = a.tenant_id 
      WHERE a.tenant_id = $1 
      ORDER BY a.assigned_at DESC
      LIMIT 200
    `, [t]),
    query(`SELECT id, name, employee_id FROM staff WHERE tenant_id = $1 AND status = 'ACTIVE' ORDER BY name`, [t]),
    query(`
      SELECT 
        e.id, 
        s.first_name || ' ' || s.last_name || ' (' || s.admission_no || ') · ' || y.name AS name 
      FROM enrollments e 
      JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id 
      JOIN academic_years y ON y.id = e.academic_year_id AND y.tenant_id = e.tenant_id 
      WHERE e.tenant_id = $1 AND e.status = 'enrolled' 
      ORDER BY s.first_name
    `, [t]),
    query(`
      SELECT 
        tda.*,
        v.registration_number AS vehicle_number,
        s.name AS driver_name
      FROM transport_driver_assignments tda
      JOIN transport_vehicles v ON v.id = tda.vehicle_id AND v.tenant_id = tda.tenant_id
      JOIN staff s ON s.id = tda.driver_id AND s.tenant_id = tda.tenant_id
      WHERE tda.tenant_id = $1
      ORDER BY tda.start_date DESC
      LIMIT 100
    `, [t]),
    query(`
      SELECT 
        vm.*,
        v.registration_number AS vehicle_number,
        vm.maintenance_type || ' · ' || v.registration_number || ' (' || vm.status || ')' AS name
      FROM vehicle_maintenance_records vm
      JOIN transport_vehicles v ON v.id = vm.vehicle_id AND v.tenant_id = vm.tenant_id
      WHERE vm.tenant_id = $1
      ORDER BY vm.created_at DESC
      LIMIT 100
    `, [t]),
    query(`
      SELECT 
        tl.*,
        v.registration_number AS vehicle_number,
        s.name AS driver_name,
        r.route_name
      FROM transport_trip_logs tl
      JOIN transport_vehicles v ON v.id = tl.vehicle_id AND v.tenant_id = tl.tenant_id
      JOIN staff s ON s.id = tl.driver_id AND s.tenant_id = tl.tenant_id
      LEFT JOIN transport_routes r ON r.id = tl.route_id AND r.tenant_id = tl.tenant_id
      WHERE tl.tenant_id = $1
      ORDER BY tl.trip_date DESC, tl.created_at DESC
      LIMIT 100
    `, [t]),
    query(`
      SELECT 
        fl.*,
        v.registration_number AS vehicle_number
      FROM transport_fuel_logs fl
      JOIN transport_vehicles v ON v.id = fl.vehicle_id AND v.tenant_id = fl.tenant_id
      WHERE fl.tenant_id = $1
      ORDER BY fl.fuel_date DESC, fl.created_at DESC
      LIMIT 100
    `, [t]),
    query("SELECT id, name, code, status FROM branches WHERE tenant_id = $1 AND status = 'active' ORDER BY name", [t]),
  ]);

  res.json({
    data: {
      vehicles: vehiclesRes.rows,
      routes: routesRes.rows,
      stops: stopsRes.rows,
      assignments: assignmentsRes.rows,
      staff: staffRes.rows,
      enrollments: enrollmentsRes.rows,
      driverAssignments: driverAssignmentsRes.rows,
      maintenance: maintenanceRes.rows,
      trips: tripsRes.rows,
      fuel: fuelRes.rows,
      branches: branchesRes.rows,
    }
  });
}));

// ---------------------------------------------------------------------------
// 2. Vehicle Registry & Lifecycle Management
// ---------------------------------------------------------------------------
const vehicleSchema = z.object({
  registrationNumber: z.string().trim().min(1).max(50),
  vehicleType: z.string().trim().min(1).max(50),
  capacity: z.number().int().min(1).max(500),
  makeModel: z.string().trim().max(100).optional().nullable(),
  ownershipType: z.enum(['OWNED', 'LEASED', 'CONTRACTED']).default('OWNED'),
  driverId: id.optional().nullable(),
  status: vehicleStatus.default('ACTIVE'),
  insuranceUntil: z.string().date().optional().nullable(),
  permitUntil: z.string().date().optional().nullable(),
  fitnessUntil: z.string().date().optional().nullable(),
  pollutionUntil: z.string().date().optional().nullable(),
  currentOdometer: z.number().int().min(0).default(0),
  branchId: id.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

router.post('/vehicles', requirePermission('transport.manage'), validateBody(vehicleSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    // Check registration number uniqueness
    const clash = (await c.query(
      `SELECT 1 FROM transport_vehicles WHERE tenant_id = $1 AND LOWER(registration_number) = LOWER($2)`,
      [req.tenantId, b.registrationNumber]
    )).rowCount;
    if (clash) throw new AppError('A vehicle with this registration number already exists.', 409, 'REGISTRATION_EXISTS');

    if (b.driverId) {
      const activeDriver = (await c.query(`SELECT 1 FROM staff WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'`, [b.driverId, req.tenantId])).rowCount;
      if (!activeDriver) throw new AppError('Active staff driver not found in this institution.', 422, 'INVALID_DRIVER');
    }
    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }

    const r = (await c.query(
      `INSERT INTO transport_vehicles(
         tenant_id, registration_number, vehicle_type, capacity, make_model, ownership_type,
         driver_id, status, insurance_until, permit_until, fitness_until, pollution_until,
         current_odometer, branch_id, notes
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        req.tenantId, b.registrationNumber, b.vehicleType, b.capacity, b.makeModel || null, b.ownershipType,
        b.driverId || null, b.status, b.insuranceUntil || null, b.permitUntil || null, b.fitnessUntil || null,
        b.pollutionUntil || null, b.currentOdometer, b.branchId || null, b.notes || null
      ]
    )).rows[0];

    await logOperation(req, c, 'transport', 'VEHICLE_CREATED', r.id);
    return r;
  });
  res.status(201).json({ data });
}));

router.patch('/vehicles/:id', validateId, requirePermission('transport.manage'), validateBody(vehicleSchema.partial()), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const old = (await c.query('SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!old) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');

    if (old.status === 'RETIRED') {
      throw new AppError('Vehicle is retired and cannot be modified.', 409, 'VEHICLE_RETIRED');
    }

    if (b.registrationNumber && b.registrationNumber.toLowerCase() !== old.registration_number.toLowerCase()) {
      const clash = (await c.query(
        `SELECT 1 FROM transport_vehicles WHERE tenant_id = $1 AND LOWER(registration_number) = LOWER($2) AND id <> $3`,
        [req.tenantId, b.registrationNumber, old.id]
      )).rowCount;
      if (clash) throw new AppError('A vehicle with this registration number already exists.', 409, 'REGISTRATION_EXISTS');
    }

    // Odometer monotonicity: odometer cannot decrease
    if (b.currentOdometer !== undefined && b.currentOdometer < old.current_odometer) {
      throw new AppError(`Current odometer (${b.currentOdometer}) cannot be lower than existing odometer reading (${old.current_odometer}).`, 422, 'ODOMETER_DECREASE');
    }

    // Active occupancy check
    const count = Number((await c.query(
      `SELECT COUNT(*) AS n 
       FROM student_transport_assignments a 
       JOIN transport_routes r ON r.id = a.route_id AND r.tenant_id = a.tenant_id 
       WHERE a.tenant_id = $1 AND r.vehicle_id = $2 AND a.ended_at IS NULL`,
      [req.tenantId, old.id]
    )).rows[0].n);

    if (b.capacity !== undefined && b.capacity < count) {
      throw new AppError(`Cannot reduce capacity to ${b.capacity}; vehicle has ${count} active student assignments.`, 409, 'VEHICLE_OCCUPIED');
    }

    if (b.status && b.status !== 'ACTIVE' && count > 0) {
      throw new AppError(`Cannot deactivate or retire vehicle with ${count} active student assignments. Reassign students first.`, 409, 'VEHICLE_OCCUPIED');
    }

    if (b.driverId === null && count > 0) {
      throw new AppError(`Cannot remove driver while vehicle has ${count} active student assignments.`, 409, 'VEHICLE_OCCUPIED');
    }

    if (b.driverId && !(await c.query(`SELECT 1 FROM staff WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'`, [b.driverId, req.tenantId])).rowCount) {
      throw new AppError('Active staff driver not found.', 422, 'INVALID_DRIVER');
    }
    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }

    const r = (await c.query(
      `UPDATE transport_vehicles SET
         registration_number = $3, vehicle_type = $4, capacity = $5, make_model = $6,
         ownership_type = $7, driver_id = $8, status = $9, insurance_until = $10,
         permit_until = $11, fitness_until = $12, pollution_until = $13,
         current_odometer = $14, branch_id = $15, notes = $16, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        old.id, req.tenantId,
        b.registrationNumber ?? old.registration_number,
        b.vehicleType ?? old.vehicle_type,
        b.capacity ?? old.capacity,
        b.makeModel !== undefined ? b.makeModel : old.make_model,
        b.ownershipType ?? old.ownership_type,
        b.driverId === undefined ? old.driver_id : b.driverId,
        b.status ?? old.status,
        b.insuranceUntil === undefined ? old.insurance_until : b.insuranceUntil,
        b.permitUntil === undefined ? old.permit_until : b.permitUntil,
        b.fitnessUntil === undefined ? old.fitness_until : b.fitnessUntil,
        b.pollutionUntil === undefined ? old.pollution_until : b.pollutionUntil,
        b.currentOdometer ?? old.current_odometer,
        b.branchId !== undefined ? b.branchId : old.branch_id,
        b.notes !== undefined ? b.notes : old.notes,
      ]
    )).rows[0];

    await logOperation(req, c, 'transport', 'VEHICLE_UPDATED', r.id, b);
    return r;
  });
  res.json({ data });
}));

// ---------------------------------------------------------------------------
// 3. Driver & Staff Assignment (Roster & Overlap Prevention)
// ---------------------------------------------------------------------------
router.post('/drivers/assign', requirePermission('transport.assign'), validateBody(z.object({
  vehicleId: id,
  driverId: id,
  licenseNumber: z.string().trim().max(100).optional().nullable(),
  licenseExpiry: z.string().date().optional().nullable(),
  startDate: z.string().date().optional(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    // 1. Lock vehicle
    const vehicle = (await c.query(
      `SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [b.vehicleId, req.tenantId]
    )).rows[0];
    if (!vehicle) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');
    if (vehicle.status !== 'ACTIVE') {
      throw new AppError(`Cannot assign driver to vehicle in status ${vehicle.status}. Vehicle must be ACTIVE.`, 409, 'VEHICLE_UNAVAILABLE');
    }

    // 2. Lock driver
    const driver = (await c.query(
      `SELECT * FROM staff WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE' FOR UPDATE`,
      [b.driverId, req.tenantId]
    )).rows[0];
    if (!driver) throw new AppError('Active staff driver not found in this institution.', 422, 'INVALID_DRIVER');

    // 3. Overlap check: Neither vehicle nor driver may have active assignment
    const activeVeh = (await c.query(
      `SELECT id FROM transport_driver_assignments WHERE vehicle_id = $1 AND status = 'ACTIVE' AND end_date IS NULL`,
      [vehicle.id]
    )).rows[0];
    if (activeVeh) throw new AppError('Vehicle already has an active driver assigned.', 409, 'DRIVER_ALREADY_ASSIGNED');

    const activeDriver = (await c.query(
      `SELECT id FROM transport_driver_assignments WHERE driver_id = $1 AND status = 'ACTIVE' AND end_date IS NULL`,
      [driver.id]
    )).rows[0];
    if (activeDriver) throw new AppError('Driver already has an active vehicle assignment.', 409, 'DRIVER_ALREADY_ASSIGNED');

    // 4. Update vehicle driver_id
    await c.query(`UPDATE transport_vehicles SET driver_id = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [vehicle.id, req.tenantId, driver.id]);

    // 5. Create assignment record
    const r = (await c.query(
      `INSERT INTO transport_driver_assignments(
         tenant_id, vehicle_id, driver_id, license_number, license_expiry, start_date, status
       ) VALUES($1, $2, $3, $4, $5, $6, 'ACTIVE') RETURNING *`,
      [req.tenantId, vehicle.id, driver.id, b.licenseNumber || null, b.licenseExpiry || null, b.startDate || new Date().toISOString().slice(0, 10)]
    )).rows[0];

    await logOperation(req, c, 'transport', 'DRIVER_ASSIGNED', r.id, { vehicleId: vehicle.id, driverId: driver.id });
    return r;
  });
  res.status(201).json({ data });
}));

router.post('/drivers/:id/end', validateId, requirePermission('transport.assign'), asyncHandler(async (req, res) => {
  const data = await transaction(async c => {
    const old = (await c.query(
      `SELECT * FROM transport_driver_assignments WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE' FOR UPDATE`,
      [req.params.id, req.tenantId]
    )).rows[0];
    if (!old) throw new AppError('Active driver assignment not found.', 404, 'NOT_FOUND');

    const r = (await c.query(
      `UPDATE transport_driver_assignments SET status = 'ENDED', end_date = CURRENT_DATE WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [old.id, req.tenantId]
    )).rows[0];

    // Clear driver on vehicle if matches
    await c.query(
      `UPDATE transport_vehicles SET driver_id = NULL, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND driver_id = $3`,
      [old.vehicle_id, req.tenantId, old.driver_id]
    );

    await logOperation(req, c, 'transport', 'DRIVER_ASSIGNMENT_ENDED', r.id);
    return r;
  });
  res.json({ data });
}));

// ---------------------------------------------------------------------------
// 4. Routes & Ordered Stops Management
// ---------------------------------------------------------------------------
router.post('/routes', requirePermission('transport.manage'), validateBody(z.object({
  name: z.string().trim().min(2).max(100),
  routeCode: z.string().trim().min(1).max(50).optional().nullable(),
  vehicleId: id,
  branchId: id.optional().nullable(),
  direction: z.enum(['PICKUP', 'DROP', 'TWO_WAY']).default('TWO_WAY'),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const v = (await c.query(
      `SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE' FOR UPDATE`,
      [b.vehicleId, req.tenantId]
    )).rows[0];
    if (!v) throw new AppError('Active vehicle not found.', 422, 'INVALID_REFERENCE');

    if (b.routeCode) {
      const clash = (await c.query('SELECT 1 FROM transport_routes WHERE tenant_id = $1 AND route_code = $2', [req.tenantId, b.routeCode])).rowCount;
      if (clash) throw new AppError('A route with this code already exists.', 409, 'ROUTE_CODE_EXISTS');
    }
    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }

    const r = (await c.query(
      `INSERT INTO transport_routes(
         tenant_id, route_name, route_code, vehicle_number, driver_name, vehicle_id,
         branch_id, direction, operational_status
       ) VALUES($1, $2, $3, $4, '', $5, $6, $7, 'ACTIVE') RETURNING *`,
      [req.tenantId, b.name, b.routeCode || null, v.registration_number, v.id, b.branchId || null, b.direction]
    )).rows[0];

    await logOperation(req, c, 'transport', 'ROUTE_CREATED', r.id);
    return r;
  });
  res.status(201).json({ data });
}));

router.patch('/routes/:id', validateId, requirePermission('transport.manage'), validateBody(z.object({
  name: z.string().trim().min(2).max(100).optional(),
  routeCode: z.string().trim().min(1).max(50).optional().nullable(),
  status: state.optional(),
  vehicleId: id.optional(),
  branchId: id.optional().nullable(),
  direction: z.enum(['PICKUP', 'DROP', 'TWO_WAY']).optional(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const initial = (await c.query('SELECT vehicle_id FROM transport_routes WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId])).rows[0];
    if (!initial) throw new AppError('Route not found.', 404, 'NOT_FOUND');

    const vehicleId = b.vehicleId ?? initial.vehicle_id;
    const lockedVehicles = await c.query(
      `SELECT * FROM transport_vehicles WHERE tenant_id = $1 AND id = ANY($2::uuid[]) ORDER BY id FOR UPDATE`,
      [req.tenantId, [initial.vehicle_id, vehicleId].filter(Boolean)]
    );
    const v = lockedVehicles.rows.find(x => x.id === vehicleId);
    if (!v) throw new AppError('Vehicle not found.', 422, 'INVALID_REFERENCE');

    const old = (await c.query('SELECT * FROM transport_routes WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (old.vehicle_id !== initial.vehicle_id) throw new AppError('Route changed concurrently. Retry.', 409, 'CONCURRENT_CHANGE');

    const occupants = Number((await c.query(
      'SELECT COUNT(*) AS n FROM student_transport_assignments WHERE tenant_id = $1 AND route_id = $2 AND ended_at IS NULL',
      [req.tenantId, old.id]
    )).rows[0].n);

    if (b.status && b.status !== 'ACTIVE' && occupants > 0) {
      throw new AppError(`End active assignments (${occupants} active) before archiving a route.`, 409, 'ROUTE_OCCUPIED');
    }

    const totalOccupantsOtherRoutes = Number((await c.query(
      `SELECT COUNT(*) AS n 
       FROM student_transport_assignments a 
       JOIN transport_routes r ON r.id = a.route_id AND r.tenant_id = a.tenant_id 
       WHERE a.tenant_id = $1 AND r.vehicle_id = $2 AND a.route_id <> $3 AND a.ended_at IS NULL`,
      [req.tenantId, vehicleId, old.id]
    )).rows[0].n);

    if (totalOccupantsOtherRoutes + occupants > v.capacity || (occupants > 0 && (v.status !== 'ACTIVE' || !v.driver_id))) {
      throw new AppError('Vehicle capacity exceeded or active driver required.', 409, 'VEHICLE_CAPACITY');
    }

    if (b.routeCode && b.routeCode !== old.route_code) {
      const clash = (await c.query('SELECT 1 FROM transport_routes WHERE tenant_id = $1 AND route_code = $2 AND id <> $3', [req.tenantId, b.routeCode, old.id])).rowCount;
      if (clash) throw new AppError('A route with this code already exists.', 409, 'ROUTE_CODE_EXISTS');
    }
    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }

    const r = (await c.query(
      `UPDATE transport_routes SET
         route_name = $3, route_code = $4, operational_status = $5, vehicle_id = $6,
         vehicle_number = $7, branch_id = $8, direction = $9
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        old.id, req.tenantId,
        b.name ?? old.route_name,
        b.routeCode !== undefined ? b.routeCode : old.route_code,
        b.status ?? old.operational_status,
        vehicleId,
        v.registration_number,
        b.branchId !== undefined ? b.branchId : old.branch_id,
        b.direction ?? old.direction,
      ]
    )).rows[0];

    await logOperation(req, c, 'transport', 'ROUTE_UPDATED', r.id, b);
    return r;
  });
  res.json({ data });
}));

// Ordered Stops
router.post('/stops', requirePermission('transport.manage'), validateBody(z.object({
  routeId: id,
  name: text,
  sequence: z.number().int().min(1).max(1000),
})), asyncHandler(async (req, res) => {
  const data = await transaction(async c => {
    if (!(await c.query(`SELECT 1 FROM transport_routes WHERE id = $1 AND tenant_id = $2 AND operational_status = 'ACTIVE'`, [req.body.routeId, req.tenantId])).rowCount) {
      throw new AppError('Active route not found.', 422, 'INVALID_REFERENCE');
    }

    const existingSeq = (await c.query(
      'SELECT id FROM route_stops WHERE tenant_id = $1 AND route_id = $2 AND sequence = $3',
      [req.tenantId, req.body.routeId, req.body.sequence]
    )).rows[0];
    if (existingSeq) {
      throw new AppError(`A stop with sequence ${req.body.sequence} already exists on this route.`, 409, 'STOP_SEQUENCE_EXISTS');
    }

    const r = (await c.query(
      'INSERT INTO route_stops(tenant_id, route_id, name, sequence) VALUES($1, $2, $3, $4) RETURNING *',
      [req.tenantId, req.body.routeId, req.body.name, req.body.sequence]
    )).rows[0];

    await logOperation(req, c, 'transport', 'ROUTE_STOP_CREATED', r.id);
    return r;
  });
  res.status(201).json({ data });
}));

// ---------------------------------------------------------------------------
// 5. Student Transport Assignments
// ---------------------------------------------------------------------------
router.post('/assignments', requirePermission('transport.assign'), validateBody(z.object({
  enrollmentId: id,
  routeId: id,
  stopId: id,
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    // 1. Initial lookup of route's vehicle
    const initial = (await c.query('SELECT vehicle_id FROM transport_routes WHERE id = $1 AND tenant_id = $2', [b.routeId, req.tenantId])).rows[0];
    if (!initial?.vehicle_id) throw new AppError('Route vehicle not found.', 422, 'INVALID_REFERENCE');

    // 2. Lock vehicle and verify active driver
    const v = (await c.query(
      `SELECT v.* FROM transport_vehicles v
       JOIN staff s ON s.id = v.driver_id AND s.tenant_id = v.tenant_id
       WHERE v.id = $1 AND v.tenant_id = $2 AND v.status = 'ACTIVE' AND s.status = 'ACTIVE'
       FOR UPDATE OF v`,
      [initial.vehicle_id, req.tenantId]
    )).rows[0];
    if (!v) throw new AppError('An active vehicle and staff driver are required.', 422, 'INVALID_DRIVER');

    // 3. Lock route
    const route = (await c.query(
      `SELECT * FROM transport_routes WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [b.routeId, req.tenantId]
    )).rows[0];
    if (route.vehicle_id !== v.id || route.operational_status !== 'ACTIVE') {
      throw new AppError('Route unavailable or changed concurrently. Retry.', 409, 'CONCURRENT_CHANGE');
    }

    // 4. Lock enrollment and verify stop
    const [enrollment, stop] = await Promise.all([
      c.query(`SELECT id FROM enrollments WHERE id = $1 AND tenant_id = $2 AND status = 'enrolled' FOR UPDATE`, [b.enrollmentId, req.tenantId]),
      c.query('SELECT 1 FROM route_stops WHERE id = $1 AND route_id = $2 AND tenant_id = $3', [b.stopId, b.routeId, req.tenantId]),
    ]);
    if (!enrollment.rowCount || !stop.rowCount) {
      throw new AppError('Active student enrollment or matching route stop not found.', 422, 'INVALID_REFERENCE');
    }

    // 5. Single active assignment invariant
    const existing = (await c.query(
      'SELECT 1 FROM student_transport_assignments WHERE enrollment_id = $1 AND ended_at IS NULL',
      [b.enrollmentId]
    )).rowCount;
    if (existing) throw new AppError('Student enrollment already has an active transport assignment.', 409, 'ALREADY_ASSIGNED');

    // 6. Capacity check across all routes using this vehicle
    const count = Number((await c.query(
      `SELECT COUNT(*) AS n 
       FROM student_transport_assignments a 
       JOIN transport_routes r ON r.id = a.route_id AND r.tenant_id = a.tenant_id 
       WHERE a.tenant_id = $1 AND r.vehicle_id = $2 AND a.ended_at IS NULL`,
      [req.tenantId, v.id]
    )).rows[0].n);

    if (count >= v.capacity) {
      throw new AppError(`Vehicle capacity reached (${count}/${v.capacity} seats occupied).`, 409, 'VEHICLE_CAPACITY');
    }

    // 7. Insert assignment
    const r = (await c.query(
      'INSERT INTO student_transport_assignments(tenant_id, enrollment_id, route_id, stop_id) VALUES($1, $2, $3, $4) RETURNING *',
      [req.tenantId, b.enrollmentId, b.routeId, b.stopId]
    )).rows[0];

    await logOperation(req, c, 'transport', 'TRANSPORT_ASSIGNED', r.id, {
      enrollmentId: b.enrollmentId,
      routeId: b.routeId,
      stopId: b.stopId,
      vehicleId: v.id
    });

    return r;
  });
  res.status(201).json({ data });
}));

router.post('/assignments/:id/end', validateId, requirePermission('transport.assign'), asyncHandler(async (req, res) => {
  const data = await transaction(async c => {
    const r = (await c.query(
      'UPDATE student_transport_assignments SET ended_at = NOW() WHERE id = $1 AND tenant_id = $2 AND ended_at IS NULL RETURNING *',
      [req.params.id, req.tenantId]
    )).rows[0];
    if (!r) throw new AppError('Active assignment not found.', 404, 'NOT_FOUND');

    await logOperation(req, c, 'transport', 'TRANSPORT_ASSIGNMENT_ENDED', r.id);
    return r;
  });
  res.json({ data });
}));

// ---------------------------------------------------------------------------
// 6. Vehicle Maintenance Management
// ---------------------------------------------------------------------------
router.post('/maintenance', requirePermission('transport.maintenance'), validateBody(z.object({
  vehicleId: id,
  maintenanceType: z.enum(['ROUTINE_SERVICE', 'MAJOR_REPAIR', 'TYRE_REPLACEMENT', 'BATTERY', 'INSPECTION', 'EMERGENCY']),
  odometerAtService: z.number().int().min(0),
  vendorWorkshop: z.string().trim().max(200).optional().nullable(),
  startDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const vehicle = (await c.query(
      'SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [b.vehicleId, req.tenantId]
    )).rows[0];
    if (!vehicle) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');

    if (vehicle.status === 'RETIRED') throw new AppError('Cannot service a retired vehicle.', 409, 'VEHICLE_RETIRED');
    if (vehicle.status === 'UNDER_MAINTENANCE') throw new AppError('Vehicle is already under maintenance.', 409, 'ALREADY_UNDER_MAINTENANCE');

    // Cannot service vehicle with active student passengers
    const occupants = Number((await c.query(
      `SELECT COUNT(*) AS n 
       FROM student_transport_assignments a 
       JOIN transport_routes r ON r.id = a.route_id AND r.tenant_id = a.tenant_id 
       WHERE a.tenant_id = $1 AND r.vehicle_id = $2 AND a.ended_at IS NULL`,
      [req.tenantId, vehicle.id]
    )).rows[0].n);
    if (occupants > 0) {
      throw new AppError(`Cannot start maintenance; vehicle has ${occupants} active student assignments. Reassign routes first.`, 409, 'VEHICLE_OCCUPIED');
    }

    if (b.odometerAtService < vehicle.current_odometer) {
      throw new AppError(`Odometer at service (${b.odometerAtService}) cannot be lower than current vehicle odometer (${vehicle.current_odometer}).`, 422, 'ODOMETER_DECREASE');
    }

    const newOdo = Math.max(vehicle.current_odometer, b.odometerAtService);
    await c.query(
      `UPDATE transport_vehicles SET status = 'UNDER_MAINTENANCE', current_odometer = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [vehicle.id, req.tenantId, newOdo]
    );

    const r = (await c.query(
      `INSERT INTO vehicle_maintenance_records(
         tenant_id, vehicle_id, maintenance_type, status, vendor_workshop, odometer_at_service,
         start_date, notes, created_by
       ) VALUES($1, $2, $3, 'IN_PROGRESS', $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.tenantId, vehicle.id, b.maintenanceType, b.vendorWorkshop || null,
        b.odometerAtService, b.startDate || new Date().toISOString().slice(0, 10), b.notes || null, req.user.id
      ]
    )).rows[0];

    await logOperation(req, c, 'transport', 'VEHICLE_MAINTENANCE_STARTED', r.id, { vehicleId: vehicle.id });
    return r;
  });
  res.status(201).json({ data });
}));

router.post('/maintenance/:id/complete', validateId, requirePermission('transport.maintenance'), validateBody(z.object({
  outcome: z.string().trim().min(3).max(2000),
  cost: z.number().min(0).optional().default(0),
  nextServiceDate: z.string().date().optional().nullable(),
  nextServiceOdometer: z.number().int().min(0).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const record = (await c.query(
      'SELECT * FROM vehicle_maintenance_records WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [req.params.id, req.tenantId]
    )).rows[0];
    if (!record) throw new AppError('Maintenance record not found.', 404, 'NOT_FOUND');
    if (record.status !== 'IN_PROGRESS' && record.status !== 'SCHEDULED') {
      throw new AppError(`Cannot complete maintenance in status ${record.status}.`, 409, 'INVALID_MAINTENANCE_STATUS');
    }

    const vehicle = (await c.query(
      'SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [record.vehicle_id, req.tenantId]
    )).rows[0];
    if (!vehicle) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');

    const updatedRecord = (await c.query(
      `UPDATE vehicle_maintenance_records SET
         status = 'COMPLETED', completion_date = CURRENT_DATE, cost = $3, notes = COALESCE(notes || E'\nOutcome: ' || $4, $4),
         next_service_date = $5, next_service_odometer = $6
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [record.id, req.tenantId, b.cost, b.outcome, b.nextServiceDate || null, b.nextServiceOdometer || null]
    )).rows[0];

    // Restore vehicle to ACTIVE if under maintenance
    if (vehicle.status === 'UNDER_MAINTENANCE') {
      await c.query(
        `UPDATE transport_vehicles SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [vehicle.id, req.tenantId]
      );
    }

    await logOperation(req, c, 'transport', 'VEHICLE_MAINTENANCE_COMPLETED', record.id, { vehicleId: vehicle.id, cost: b.cost });
    return updatedRecord;
  });
  res.json({ data });
}));

router.post('/maintenance/:id/cancel', validateId, requirePermission('transport.maintenance'), asyncHandler(async (req, res) => {
  const data = await transaction(async c => {
    const record = (await c.query(
      'SELECT * FROM vehicle_maintenance_records WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [req.params.id, req.tenantId]
    )).rows[0];
    if (!record) throw new AppError('Maintenance record not found.', 404, 'NOT_FOUND');
    if (record.status !== 'IN_PROGRESS' && record.status !== 'SCHEDULED') {
      throw new AppError(`Cannot cancel maintenance in status ${record.status}.`, 409, 'INVALID_MAINTENANCE_STATUS');
    }

    const updatedRecord = (await c.query(
      `UPDATE vehicle_maintenance_records SET status = 'CANCELLED' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [record.id, req.tenantId]
    )).rows[0];

    // Restore vehicle to ACTIVE if under maintenance
    await c.query(
      `UPDATE transport_vehicles SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'UNDER_MAINTENANCE'`,
      [record.vehicle_id, req.tenantId]
    );

    await logOperation(req, c, 'transport', 'VEHICLE_MAINTENANCE_CANCELLED', record.id);
    return updatedRecord;
  });
  res.json({ data });
}));

// ---------------------------------------------------------------------------
// 7. Trip & Fuel Logging Foundation
// ---------------------------------------------------------------------------
router.post('/trips', requirePermission('transport.trip.manage'), validateBody(z.object({
  vehicleId: id,
  driverId: id,
  routeId: id.optional().nullable(),
  tripDate: z.string().date().optional(),
  startOdometer: z.number().int().min(0),
  endOdometer: z.number().int().min(0).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  if (b.endOdometer !== undefined && b.endOdometer !== null && b.endOdometer < b.startOdometer) {
    throw new AppError('End odometer cannot be lower than start odometer.', 422, 'ODOMETER_DECREASE');
  }

  const data = await transaction(async c => {
    const vehicle = (await c.query(
      'SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [b.vehicleId, req.tenantId]
    )).rows[0];
    if (!vehicle) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');
    if (['RETIRED', 'OUT_OF_SERVICE', 'UNDER_MAINTENANCE'].includes(vehicle.status)) {
      throw new AppError(`Vehicle is in status ${vehicle.status} and cannot be operated.`, 409, 'VEHICLE_UNAVAILABLE');
    }

    const driver = (await c.query('SELECT 1 FROM staff WHERE id = $1 AND tenant_id = $2 AND status = \'ACTIVE\'', [b.driverId, req.tenantId])).rowCount;
    if (!driver) throw new AppError('Active staff driver not found.', 422, 'INVALID_DRIVER');

    if (b.routeId && !(await c.query('SELECT 1 FROM transport_routes WHERE id = $1 AND tenant_id = $2', [b.routeId, req.tenantId])).rowCount) {
      throw new AppError('Route not found.', 422, 'INVALID_REFERENCE');
    }

    if (b.startOdometer < vehicle.current_odometer) {
      throw new AppError(`Start odometer (${b.startOdometer}) cannot be lower than vehicle current odometer (${vehicle.current_odometer}).`, 422, 'ODOMETER_DECREASE');
    }

    const isCompleted = b.endOdometer !== undefined && b.endOdometer !== null;
    const finalStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
    const finalOdo = isCompleted ? b.endOdometer! : b.startOdometer;

    if (finalOdo > vehicle.current_odometer) {
      await c.query(
        'UPDATE transport_vehicles SET current_odometer = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [vehicle.id, req.tenantId, finalOdo]
      );
    }

    const r = (await c.query(
      `INSERT INTO transport_trip_logs(
         tenant_id, vehicle_id, driver_id, route_id, trip_date, start_odometer, end_odometer, status, notes
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.tenantId, vehicle.id, b.driverId, b.routeId || null,
        b.tripDate || new Date().toISOString().slice(0, 10), b.startOdometer, b.endOdometer || null,
        finalStatus, b.notes || null
      ]
    )).rows[0];

    await logOperation(req, c, 'transport', 'TRIP_RECORDED', r.id, { vehicleId: vehicle.id, status: finalStatus });
    return r;
  });
  res.status(201).json({ data });
}));

router.post('/trips/:id/complete', validateId, requirePermission('transport.trip.manage'), validateBody(z.object({
  endOdometer: z.number().int().min(0),
  notes: z.string().trim().max(1000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const trip = (await c.query(
      'SELECT * FROM transport_trip_logs WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [req.params.id, req.tenantId]
    )).rows[0];
    if (!trip) throw new AppError('Trip log not found.', 404, 'NOT_FOUND');
    if (trip.status !== 'IN_PROGRESS') {
      throw new AppError(`Trip is already in status ${trip.status}.`, 409, 'INVALID_TRIP_STATUS');
    }
    if (b.endOdometer < trip.start_odometer) {
      throw new AppError(`End odometer (${b.endOdometer}) cannot be lower than trip start odometer (${trip.start_odometer}).`, 422, 'ODOMETER_DECREASE');
    }

    const vehicle = (await c.query(
      'SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [trip.vehicle_id, req.tenantId]
    )).rows[0];

    const updatedTrip = (await c.query(
      `UPDATE transport_trip_logs SET
         status = 'COMPLETED', end_odometer = $3, notes = COALESCE(notes || E'\n' || $4, $4)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [trip.id, req.tenantId, b.endOdometer, b.notes || null]
    )).rows[0];

    if (vehicle && b.endOdometer > vehicle.current_odometer) {
      await c.query(
        'UPDATE transport_vehicles SET current_odometer = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [vehicle.id, req.tenantId, b.endOdometer]
      );
    }

    await logOperation(req, c, 'transport', 'TRIP_COMPLETED', trip.id, { endOdometer: b.endOdometer });
    return updatedTrip;
  });
  res.json({ data });
}));

router.post('/fuel', requirePermission('transport.trip.manage'), validateBody(z.object({
  vehicleId: id,
  fuelDate: z.string().date().optional(),
  quantity: z.number().positive().max(5000),
  unit: z.string().trim().min(1).max(20).default('liters'),
  cost: z.number().min(0).max(1000000),
  odometerReading: z.number().int().min(0),
  vendorSource: z.string().trim().max(150).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const vehicle = (await c.query(
      'SELECT * FROM transport_vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [b.vehicleId, req.tenantId]
    )).rows[0];
    if (!vehicle) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');
    if (vehicle.status === 'RETIRED') {
      throw new AppError('Cannot log fuel for a retired vehicle.', 409, 'VEHICLE_RETIRED');
    }

    if (b.odometerReading < vehicle.current_odometer) {
      throw new AppError(`Odometer reading (${b.odometerReading}) cannot be lower than current vehicle odometer (${vehicle.current_odometer}).`, 422, 'ODOMETER_DECREASE');
    }

    if (b.odometerReading > vehicle.current_odometer) {
      await c.query(
        'UPDATE transport_vehicles SET current_odometer = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [vehicle.id, req.tenantId, b.odometerReading]
      );
    }

    const r = (await c.query(
      `INSERT INTO transport_fuel_logs(
         tenant_id, vehicle_id, fuel_date, quantity, unit, cost, odometer_reading, vendor_source, notes, recorded_by
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.tenantId, vehicle.id, b.fuelDate || new Date().toISOString().slice(0, 10),
        b.quantity, b.unit, b.cost, b.odometerReading, b.vendorSource || null, b.notes || null, req.user.id
      ]
    )).rows[0];

    await logOperation(req, c, 'transport', 'FUEL_RECORDED', r.id, { vehicleId: vehicle.id, quantity: b.quantity, cost: b.cost });
    return r;
  });
  res.status(201).json({ data });
}));

router.use((_req, _res, next) => next(new AppError('Transport endpoint not found.', 404, 'NOT_FOUND')));
router.use(operationError);

export default router;
