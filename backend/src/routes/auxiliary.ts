import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();

// ==============================
// INVENTORY
// ==============================
router.get('/inventory', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM inventory_items WHERE tenant_id = $1 ORDER BY name ASC', [req.tenantId]);
  res.json({
    data: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      category: r.category,
      quantity: r.quantity,
      unit: r.unit,
      minStockAlert: r.min_stock_alert,
      unitCost: Number(r.unit_cost),
      status: r.status,
    })),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post('/inventory', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const { name, sku, category, quantity = 0, unit = 'pcs', unitCost = 0 } = req.body;
  const result = await query(
    `INSERT INTO inventory_items (tenant_id, name, sku, category, quantity, unit, unit_cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.tenantId, name, sku || `SKU-${Date.now().toString().slice(-4)}`, category || 'General', quantity, unit, unitCost]
  );
  res.status(201).json({ data: result.rows[0], requestId: req.id, timestamp: new Date().toISOString() });
});

// ==============================
// LIBRARY
// ==============================
router.get('/library', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM library_books WHERE tenant_id = $1 ORDER BY title ASC', [req.tenantId]);
  res.json({
    data: result.rows.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      totalCopies: b.total_copies,
      availableCopies: b.available_copies,
      status: b.status,
    })),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post('/library', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const { title, author, isbn, category, totalCopies = 1 } = req.body;
  const result = await query(
    `INSERT INTO library_books (tenant_id, title, author, isbn, category, total_copies, available_copies)
     VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
    [req.tenantId, title, author, isbn || null, category || 'General', totalCopies]
  );
  res.status(201).json({ data: result.rows[0], requestId: req.id, timestamp: new Date().toISOString() });
});

// ==============================
// HOSTEL
// ==============================
router.get('/hostel', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM hostel_rooms WHERE tenant_id = $1 ORDER BY hostel_name, room_number', [req.tenantId]);
  res.json({
    data: result.rows.map((h) => ({
      id: h.id,
      hostelName: h.hostel_name,
      roomNumber: h.room_number,
      capacity: h.capacity,
      occupied: h.occupied,
      monthlyFee: Number(h.monthly_fee),
      status: h.status,
    })),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// ==============================
// MESS
// ==============================
router.get('/mess', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM mess_menus WHERE tenant_id = $1 ORDER BY day_of_week ASC', [req.tenantId]);
  res.json({
    data: result.rows.map((m) => ({
      id: m.id,
      dayOfWeek: m.day_of_week,
      mealType: m.meal_type,
      menuItems: m.menu_items,
    })),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// ==============================
// TRANSPORT
// ==============================
router.get('/transport', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM transport_routes WHERE tenant_id = $1 ORDER BY route_name ASC', [req.tenantId]);
  res.json({
    data: result.rows.map((t) => ({
      id: t.id,
      routeName: t.route_name,
      vehicleNumber: t.vehicle_number,
      driverName: t.driver_name,
      driverPhone: t.driver_phone,
      capacity: t.capacity,
      stops: t.stops || [],
      status: t.status,
    })),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// ==============================
// HEALTH
// ==============================
router.get('/health-records', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    `SELECT hr.*, s.first_name, s.last_name, s.admission_no
     FROM health_records hr
     JOIN students s ON s.id = hr.student_id
     WHERE hr.tenant_id = $1`,
    [req.tenantId]
  );
  res.json({
    data: result.rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: `${r.first_name} ${r.last_name || ''}`.trim(),
      admissionNo: r.admission_no,
      bloodGroup: r.blood_group,
      allergies: r.allergies,
      medicalConditions: r.medical_conditions,
      emergencyContact: r.emergency_contact,
      emergencyPhone: r.emergency_phone,
    })),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// ==============================
// REPORTS EXPORT
// ==============================
router.post('/reports/export', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const { resourceType = 'students' } = req.body;
  const jobId = `job_export_${Date.now()}`;
  res.status(201).json({
    data: {
      jobId,
      status: 'completed',
      resourceType,
      downloadUrl: `data:text/csv;charset=utf-8,Demo Export Data For ${resourceType}`,
      estimatedCompletionTime: 'Instant',
      createdAt: new Date().toISOString(),
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
