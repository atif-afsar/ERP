import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { query, transaction } from '../db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { id, text, state, validateId, logOperation, operationError } from './operationsSupport.js';

const router = Router();
router.use(tenantContext(true));

// ---------------------------------------------------------------------------
// 1. GET /api/v1/inventory - Consolidated Operational Dataset & Reports
// ---------------------------------------------------------------------------
router.get('/', requirePermission('inventory.view'), asyncHandler(async (req, res) => {
  const t = req.tenantId;
  const [
    itemsRes,
    categoriesRes,
    locationsRes,
    vendorsRes,
    branchesRes,
    movementsRes,
    balancesRes,
    assetsRes,
    maintenanceRes,
    historyRes,
    staffRes,
    studentsRes,
  ] = await Promise.all([
    query(`
      SELECT 
        i.id, i.name, i.sku, i.item_type, i.unit, i.min_stock_alert,
        i.lifecycle_status status, c.name AS category, c.id AS category_id,
        b.name AS branch_name, v.name AS vendor_name,
        COALESCE(SUM(st.quantity_delta), 0)::int AS stock,
        COALESCE(SUM(st.quantity_delta), 0) <= i.min_stock_alert AS low_stock
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON c.id = i.category_id AND c.tenant_id = i.tenant_id
      LEFT JOIN branches b ON b.id = i.branch_id AND b.tenant_id = i.tenant_id
      LEFT JOIN inventory_vendors v ON v.id = i.vendor_id AND v.tenant_id = i.tenant_id
      LEFT JOIN stock_transactions st ON st.item_id = i.id AND st.tenant_id = i.tenant_id
      WHERE i.tenant_id = $1
      GROUP BY i.id, c.name, c.id, b.name, v.name
      ORDER BY i.name
    `, [t]),
    query('SELECT * FROM inventory_categories WHERE tenant_id = $1 ORDER BY name', [t]),
    query('SELECT * FROM inventory_locations WHERE tenant_id = $1 ORDER BY name', [t]),
    query('SELECT * FROM inventory_vendors WHERE tenant_id = $1 ORDER BY name', [t]),
    query("SELECT id, name, code, status FROM branches WHERE tenant_id = $1 AND status = 'active' ORDER BY name", [t]),
    query(`
      SELECT 
        st.*, 
        i.name AS item_name, 
        l.name AS location_name,
        dl.name AS dest_location_name,
        v.name AS vendor_name,
        u.email AS recorded_by_email,
        st.type || ' · ' || i.name || ' · ' || l.name || ' · ' || st.quantity_delta AS name
      FROM stock_transactions st
      JOIN inventory_items i ON i.id = st.item_id AND i.tenant_id = st.tenant_id
      JOIN inventory_locations l ON l.id = st.location_id AND l.tenant_id = st.tenant_id
      LEFT JOIN inventory_locations dl ON dl.id = st.destination_location_id AND dl.tenant_id = st.tenant_id
      LEFT JOIN inventory_vendors v ON v.id = st.vendor_id AND v.tenant_id = st.tenant_id
      LEFT JOIN users u ON u.id = st.recorded_by
      WHERE st.tenant_id = $1
      ORDER BY st.created_at DESC
      LIMIT 200
    `, [t]),
    query(`
      SELECT 
        i.id::text || ':' || l.id::text AS id,
        i.id AS item_id,
        l.id AS location_id,
        i.name AS item_name,
        l.name AS location_name,
        SUM(st.quantity_delta)::int AS stock
      FROM stock_transactions st
      JOIN inventory_items i ON i.id = st.item_id AND i.tenant_id = st.tenant_id
      JOIN inventory_locations l ON l.id = st.location_id AND l.tenant_id = st.tenant_id
      WHERE st.tenant_id = $1
      GROUP BY i.id, l.id, i.name, l.name
      HAVING SUM(st.quantity_delta) <> 0
      ORDER BY i.name, l.name
    `, [t]),
    query(`
      SELECT 
        fa.*,
        c.name AS category_name,
        l.name AS location_name,
        b.name AS branch_name,
        v.name AS vendor_name,
        s.name AS custodian_name,
        fa.asset_tag || ' · ' || fa.name AS name
      FROM fixed_assets fa
      JOIN inventory_categories c ON c.id = fa.category_id AND c.tenant_id = fa.tenant_id
      LEFT JOIN inventory_locations l ON l.id = fa.location_id AND l.tenant_id = fa.tenant_id
      LEFT JOIN branches b ON b.id = fa.branch_id AND b.tenant_id = fa.tenant_id
      LEFT JOIN inventory_vendors v ON v.id = fa.vendor_id AND v.tenant_id = fa.tenant_id
      LEFT JOIN staff s ON s.id = fa.custodian_id AND s.tenant_id = fa.tenant_id
      WHERE fa.tenant_id = $1
      ORDER BY fa.asset_tag
    `, [t]),
    query(`
      SELECT 
        am.*,
        fa.asset_tag,
        fa.name AS asset_name,
        am.maintenance_type || ' · ' || fa.asset_tag || ' (' || am.status || ')' AS name
      FROM asset_maintenance_records am
      JOIN fixed_assets fa ON fa.id = am.asset_id AND fa.tenant_id = am.tenant_id
      WHERE am.tenant_id = $1
      ORDER BY am.created_at DESC
      LIMIT 100
    `, [t]),
    query(`
      SELECT 
        h.*,
        fa.asset_tag,
        fa.name AS asset_name,
        s.name AS custodian_name
      FROM asset_custodian_history h
      JOIN fixed_assets fa ON fa.id = h.asset_id AND fa.tenant_id = h.tenant_id
      JOIN staff s ON s.id = h.custodian_id AND s.tenant_id = h.tenant_id
      WHERE h.tenant_id = $1
      ORDER BY h.assigned_at DESC
      LIMIT 100
    `, [t]),
    query("SELECT id, name, employee_id FROM staff WHERE tenant_id = $1 AND status = 'ACTIVE' ORDER BY name", [t]),
    query("SELECT id, first_name || ' ' || last_name AS name, admission_no FROM students WHERE tenant_id = $1 AND status = 'active' ORDER BY first_name", [t]),
  ]);

  const items = itemsRes.rows;
  const movements = movementsRes.rows;
  const issues = movements.filter(m => m.type === 'ISSUE');
  const lowStock = items.filter(i => i.low_stock && i.status === 'ACTIVE');

  res.json({
    data: {
      items,
      categories: categoriesRes.rows,
      locations: locationsRes.rows,
      vendors: vendorsRes.rows,
      branches: branchesRes.rows,
      movements,
      issues,
      balances: balancesRes.rows,
      assets: assetsRes.rows,
      assetMaintenance: maintenanceRes.rows,
      assetHistory: historyRes.rows,
      staff: staffRes.rows,
      students: studentsRes.rows,
      lowStock,
    }
  });
}));

// ---------------------------------------------------------------------------
// 2. Master Data Management (Categories, Locations, Vendors, Items)
// ---------------------------------------------------------------------------
for (const name of ['categories', 'locations'] as const) {
  router.post(`/${name}`, requirePermission('inventory.manage'), validateBody(z.object({
    name: z.string().trim().min(1).max(100)
  })), asyncHandler(async (req, res) => {
    const data = await transaction(async c => {
      const existing = (await c.query(`SELECT id FROM inventory_${name} WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)`, [req.tenantId, req.body.name])).rows[0];
      if (existing) throw new AppError(`A ${name.slice(0, -1)} with this name already exists.`, 409, 'NAME_CONFLICT');
      const r = (await c.query(`INSERT INTO inventory_${name}(tenant_id, name) VALUES($1, $2) RETURNING *`, [req.tenantId, req.body.name])).rows[0];
      await logOperation(req, c, 'inventory', `INVENTORY_${name.toUpperCase()}_CREATED`, r.id);
      return r;
    });
    res.status(201).json({ data });
  }));
}

// Vendors
router.post('/vendors', requirePermission('inventory.manage'), validateBody(z.object({
  name: z.string().trim().min(1).max(150),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  status: state.default('ACTIVE'),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const existing = (await c.query('SELECT id FROM inventory_vendors WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)', [req.tenantId, b.name])).rows[0];
    if (existing) throw new AppError('A vendor with this name already exists.', 409, 'VENDOR_EXISTS');
    const r = (await c.query(
      `INSERT INTO inventory_vendors(tenant_id, name, contact_person, email, phone, address, status)
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.tenantId, b.name, b.contactPerson || null, b.email || null, b.phone || null, b.address || null, b.status]
    )).rows[0];
    await logOperation(req, c, 'inventory', 'INVENTORY_VENDOR_CREATED', r.id);
    return r;
  });
  res.status(201).json({ data });
}));

router.patch('/vendors/:id', validateId, requirePermission('inventory.manage'), validateBody(z.object({
  name: z.string().trim().min(1).max(150).optional(),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  status: state.optional(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const old = (await c.query('SELECT * FROM inventory_vendors WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!old) throw new AppError('Vendor not found.', 404, 'NOT_FOUND');
    if (b.name && b.name.toLowerCase() !== old.name.toLowerCase()) {
      const clash = (await c.query('SELECT id FROM inventory_vendors WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3', [req.tenantId, b.name, old.id])).rows[0];
      if (clash) throw new AppError('A vendor with this name already exists.', 409, 'VENDOR_EXISTS');
    }
    const r = (await c.query(
      `UPDATE inventory_vendors SET
         name = $3, contact_person = $4, email = $5, phone = $6, address = $7, status = $8
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        old.id, req.tenantId,
        b.name ?? old.name,
        b.contactPerson !== undefined ? b.contactPerson : old.contact_person,
        b.email !== undefined ? b.email : old.email,
        b.phone !== undefined ? b.phone : old.phone,
        b.address !== undefined ? b.address : old.address,
        b.status ?? old.status,
      ]
    )).rows[0];
    await logOperation(req, c, 'inventory', 'INVENTORY_VENDOR_UPDATED', r.id, b);
    return r;
  });
  res.json({ data });
}));

// Items
router.post('/items', requirePermission('inventory.manage'), validateBody(z.object({
  name: text,
  sku: z.string().trim().min(1).max(100).optional().nullable(),
  categoryId: id,
  itemType: z.enum(['CONSUMABLE', 'ASSET']),
  unit: z.string().trim().min(1).max(50),
  minStockAlert: z.number().int().min(0).max(1000000),
  branchId: id.optional().nullable(),
  vendorId: id.optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const category = (await c.query('SELECT name FROM inventory_categories WHERE id = $1 AND tenant_id = $2', [b.categoryId, req.tenantId])).rows[0];
    if (!category) throw new AppError('Category not found.', 422, 'INVALID_REFERENCE');

    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.vendorId && !(await c.query('SELECT 1 FROM inventory_vendors WHERE id = $1 AND tenant_id = $2', [b.vendorId, req.tenantId])).rowCount) {
      throw new AppError('Vendor not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.sku) {
      const clash = (await c.query('SELECT 1 FROM inventory_items WHERE tenant_id = $1 AND sku = $2', [req.tenantId, b.sku])).rowCount;
      if (clash) throw new AppError('An item with this SKU already exists in this institution.', 409, 'SKU_EXISTS');
    }

    const r = (await c.query(
      `INSERT INTO inventory_items(
         tenant_id, name, sku, category, category_id, item_type, unit, min_stock_alert, quantity, branch_id, vendor_id
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10) RETURNING *`,
      [req.tenantId, b.name, b.sku || null, category.name, b.categoryId, b.itemType, b.unit, b.minStockAlert, b.branchId || null, b.vendorId || null]
    )).rows[0];
    await logOperation(req, c, 'inventory', 'INVENTORY_ITEM_CREATED', r.id);
    return r;
  });
  res.status(201).json({ data });
}));

router.patch('/items/:id', validateId, requirePermission('inventory.manage'), validateBody(z.object({
  name: text.optional(),
  sku: z.string().trim().min(1).max(100).optional().nullable(),
  categoryId: id.optional(),
  unit: z.string().trim().min(1).max(50).optional(),
  minStockAlert: z.number().int().min(0).max(1000000).optional(),
  branchId: id.optional().nullable(),
  vendorId: id.optional().nullable(),
  status: state.optional(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const old = (await c.query('SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!old) throw new AppError('Item not found.', 404, 'NOT_FOUND');

    if (b.categoryId && !(await c.query('SELECT 1 FROM inventory_categories WHERE id = $1 AND tenant_id = $2', [b.categoryId, req.tenantId])).rowCount) {
      throw new AppError('Category not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.vendorId && !(await c.query('SELECT 1 FROM inventory_vendors WHERE id = $1 AND tenant_id = $2', [b.vendorId, req.tenantId])).rowCount) {
      throw new AppError('Vendor not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.sku && b.sku !== old.sku) {
      const clash = (await c.query('SELECT 1 FROM inventory_items WHERE tenant_id = $1 AND sku = $2 AND id <> $3', [req.tenantId, b.sku, old.id])).rowCount;
      if (clash) throw new AppError('An item with this SKU already exists in this institution.', 409, 'SKU_EXISTS');
    }

    const r = (await c.query(
      `UPDATE inventory_items SET
         name = $3, sku = $4, category_id = $5, unit = $6, min_stock_alert = $7,
         branch_id = $8, vendor_id = $9, lifecycle_status = $10
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        old.id, req.tenantId,
        b.name ?? old.name,
        b.sku !== undefined ? b.sku : old.sku,
        b.categoryId ?? old.category_id,
        b.unit ?? old.unit,
        b.minStockAlert ?? old.min_stock_alert,
        b.branchId !== undefined ? b.branchId : old.branch_id,
        b.vendorId !== undefined ? b.vendorId : old.vendor_id,
        b.status ?? old.lifecycle_status,
      ]
    )).rows[0];
    await logOperation(req, c, 'inventory', 'INVENTORY_ITEM_UPDATED', r.id, b);
    return r;
  });
  res.json({ data });
}));

// ---------------------------------------------------------------------------
// 3. Stock Movements & Store-to-Store Transfers
// ---------------------------------------------------------------------------
router.post('/movements', requirePermission('inventory.transact'), validateBody(z.object({
  itemId: id,
  locationId: id,
  type: z.enum(['RECEIPT', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'DAMAGED', 'LOST', 'DISPOSAL']),
  quantity: z.number().int().min(-1000000).max(1000000).refine(x => x !== 0, 'Quantity cannot be zero.'),
  reason: z.string().trim().min(3).max(2000),
  sourceIssueId: id.optional().nullable(),
  recipientType: z.enum(['STAFF', 'STUDENT', 'DEPARTMENT', 'BRANCH', 'OTHER']).optional().nullable(),
  recipientId: id.optional().nullable(),
  vendorId: id.optional().nullable(),
  unitCost: z.number().min(0).optional(),
}).refine(b => b.type === 'ADJUSTMENT' || b.quantity > 0, 'Quantity must be positive.')
  .refine(b => (b.type === 'RETURN') === Boolean(b.sourceIssueId), 'Returns require a source issue only.')
), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    // 1. Lock item under authoritative copy-book canonical lock
    const item = (await c.query(
      `SELECT id, name, unit FROM inventory_items WHERE id = $1 AND tenant_id = $2 AND lifecycle_status = 'ACTIVE' FOR UPDATE`,
      [b.itemId, req.tenantId]
    )).rows[0];
    if (!item) throw new AppError('Active inventory item not found.', 422, 'INVALID_REFERENCE');

    // 2. Validate location
    const location = (await c.query(
      `SELECT id, name FROM inventory_locations WHERE id = $1 AND tenant_id = $2`,
      [b.locationId, req.tenantId]
    )).rows[0];
    if (!location) throw new AppError('Storage location not found in this institution.', 422, 'INVALID_REFERENCE');

    // 3. Validate recipient if provided
    if (b.recipientType === 'STAFF' && b.recipientId) {
      const staffMember = (await c.query(`SELECT id FROM staff WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'`, [b.recipientId, req.tenantId])).rows[0];
      if (!staffMember) throw new AppError('Recipient staff member not found or is inactive.', 422, 'INVALID_RECIPIENT');
    }
    if (b.recipientType === 'STUDENT' && b.recipientId) {
      const student = (await c.query(`SELECT id FROM students WHERE id = $1 AND tenant_id = $2 AND status = 'active'`, [b.recipientId, req.tenantId])).rows[0];
      if (!student) throw new AppError('Recipient student not found or is inactive.', 422, 'INVALID_RECIPIENT');
    }
    if (b.vendorId && !(await c.query('SELECT 1 FROM inventory_vendors WHERE id = $1 AND tenant_id = $2', [b.vendorId, req.tenantId])).rowCount) {
      throw new AppError('Referenced vendor not found.', 422, 'INVALID_REFERENCE');
    }

    // 4. Calculate delta and check balance
    let delta = b.quantity;
    if (['ISSUE', 'DAMAGED', 'LOST', 'DISPOSAL'].includes(b.type)) {
      delta = -b.quantity;
    } else if (['RECEIPT', 'RETURN'].includes(b.type)) {
      delta = b.quantity;
    } // ADJUSTMENT uses signed quantity directly

    const balanceRes = await c.query(
      `SELECT COALESCE(SUM(quantity_delta), 0) AS stock FROM stock_transactions WHERE tenant_id = $1 AND item_id = $2 AND location_id = $3`,
      [req.tenantId, b.itemId, b.locationId]
    );
    const balance = Number(balanceRes.rows[0].stock);

    if (balance + delta < 0) {
      throw new AppError('Insufficient stock at this location.', 409, 'INSUFFICIENT_STOCK');
    }

    // 5. Return validation
    if (b.type === 'RETURN') {
      const issue = (await c.query(
        `SELECT quantity_delta FROM stock_transactions 
         WHERE id = $1 AND tenant_id = $2 AND item_id = $3 AND location_id = $4 AND type = 'ISSUE'`,
        [b.sourceIssueId, req.tenantId, b.itemId, b.locationId]
      )).rows[0];
      if (!issue) throw new AppError('Matching source issue not found at this location.', 422, 'INVALID_REFERENCE');

      const returned = Number((await c.query(
        `SELECT COALESCE(SUM(quantity_delta), 0) AS qty FROM stock_transactions WHERE source_issue_id = $1 AND tenant_id = $2`,
        [b.sourceIssueId, req.tenantId]
      )).rows[0].qty);

      const remaining = -issue.quantity_delta - returned;
      if (b.quantity > remaining) {
        throw new AppError(`Return quantity exceeds remaining issued quantity (${remaining} remaining).`, 409, 'EXCESS_RETURN');
      }
    }

    // 6. Record immutable transaction
    const r = (await c.query(
      `INSERT INTO stock_transactions(
         tenant_id, item_id, location_id, type, quantity_delta, source_issue_id, reason,
         recorded_by, recipient_type, recipient_id, vendor_id, unit_cost
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        req.tenantId, b.itemId, b.locationId, b.type, delta, b.sourceIssueId || null, b.reason,
        req.user.id, b.recipientType || null, b.recipientId || null, b.vendorId || null, b.unitCost || 0
      ]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'STOCK_MOVEMENT_RECORDED', r.id, {
      type: b.type,
      delta,
      balanceAfter: balance + delta
    });

    return r;
  });
  res.status(201).json({ data });
}));

// Store-to-store transfer (Atomic paired transfer_out + transfer_in)
router.post('/transfers', requirePermission('inventory.transact'), validateBody(z.object({
  itemId: id,
  sourceLocationId: id,
  destinationLocationId: id,
  quantity: z.number().int().min(1).max(1000000),
  reason: z.string().trim().min(3).max(2000),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  if (b.sourceLocationId === b.destinationLocationId) {
    throw new AppError('Source and destination locations must be different.', 409, 'SAME_LOCATION_TRANSFER');
  }

  const data = await transaction(async c => {
    // 1. Lock item
    const item = (await c.query(
      `SELECT id, name FROM inventory_items WHERE id = $1 AND tenant_id = $2 AND lifecycle_status = 'ACTIVE' FOR UPDATE`,
      [b.itemId, req.tenantId]
    )).rows[0];
    if (!item) throw new AppError('Active inventory item not found.', 422, 'INVALID_REFERENCE');

    // 2. Verify source and destination locations
    const [srcLoc, dstLoc] = await Promise.all([
      c.query('SELECT id, name FROM inventory_locations WHERE id = $1 AND tenant_id = $2', [b.sourceLocationId, req.tenantId]),
      c.query('SELECT id, name FROM inventory_locations WHERE id = $1 AND tenant_id = $2', [b.destinationLocationId, req.tenantId]),
    ]);
    if (!srcLoc.rowCount || !dstLoc.rowCount) {
      throw new AppError('Source or destination location not found in this institution.', 422, 'INVALID_REFERENCE');
    }

    // 3. Check stock balance at source location
    const balance = Number((await c.query(
      `SELECT COALESCE(SUM(quantity_delta), 0) AS stock FROM stock_transactions WHERE tenant_id = $1 AND item_id = $2 AND location_id = $3`,
      [req.tenantId, b.itemId, b.sourceLocationId]
    )).rows[0].stock);

    if (balance < b.quantity) {
      throw new AppError(`Insufficient stock at source location (${balance} available, requested ${b.quantity}).`, 409, 'INSUFFICIENT_STOCK');
    }

    const pairId = crypto.randomUUID();

    // 4. Atomic pair: TRANSFER_OUT then TRANSFER_IN
    const outRecord = (await c.query(
      `INSERT INTO stock_transactions(
         tenant_id, item_id, location_id, type, quantity_delta, destination_location_id, transfer_pair_id, reason, recorded_by
       ) VALUES($1, $2, $3, 'TRANSFER_OUT', $4, $5, $6, $7, $8) RETURNING *`,
      [req.tenantId, b.itemId, b.sourceLocationId, -b.quantity, b.destinationLocationId, pairId, b.reason, req.user.id]
    )).rows[0];

    const inRecord = (await c.query(
      `INSERT INTO stock_transactions(
         tenant_id, item_id, location_id, type, quantity_delta, destination_location_id, transfer_pair_id, reason, recorded_by
       ) VALUES($1, $2, $3, 'TRANSFER_IN', $4, $5, $6, $7, $8) RETURNING *`,
      [req.tenantId, b.itemId, b.destinationLocationId, b.quantity, b.sourceLocationId, pairId, b.reason, req.user.id]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'STOCK_TRANSFER_COMPLETED', pairId, {
      itemId: b.itemId,
      quantity: b.quantity,
      sourceLocationId: b.sourceLocationId,
      destinationLocationId: b.destinationLocationId,
      outRecordId: outRecord.id,
      inRecordId: inRecord.id,
    });

    return {
      pairId,
      outRecord,
      inRecord,
    };
  });

  res.status(201).json({ data });
}));

// ---------------------------------------------------------------------------
// 4. Durable Fixed Asset Register & Lifecycle Management
// ---------------------------------------------------------------------------
router.post('/assets', requirePermission('assets.manage'), validateBody(z.object({
  assetTag: z.string().trim().min(1).max(100),
  name: text,
  categoryId: id,
  locationId: id.optional().nullable(),
  branchId: id.optional().nullable(),
  vendorId: id.optional().nullable(),
  serialNumber: z.string().trim().max(100).optional().nullable(),
  purchaseDate: z.string().date().optional().nullable(),
  purchaseCost: z.number().min(0).optional().default(0),
  warrantyExpiry: z.string().date().optional().nullable(),
  condition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED']).default('GOOD'),
  notes: z.string().trim().max(2000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    // Verify category
    if (!(await c.query('SELECT 1 FROM inventory_categories WHERE id = $1 AND tenant_id = $2', [b.categoryId, req.tenantId])).rowCount) {
      throw new AppError('Category not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.locationId && !(await c.query('SELECT 1 FROM inventory_locations WHERE id = $1 AND tenant_id = $2', [b.locationId, req.tenantId])).rowCount) {
      throw new AppError('Location not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.vendorId && !(await c.query('SELECT 1 FROM inventory_vendors WHERE id = $1 AND tenant_id = $2', [b.vendorId, req.tenantId])).rowCount) {
      throw new AppError('Vendor not found.', 422, 'INVALID_REFERENCE');
    }

    const clash = (await c.query('SELECT 1 FROM fixed_assets WHERE tenant_id = $1 AND asset_tag = $2', [req.tenantId, b.assetTag])).rowCount;
    if (clash) throw new AppError('An asset with this tag already exists in this institution.', 409, 'ASSET_TAG_EXISTS');

    const normSerial = b.serialNumber && b.serialNumber.trim() ? b.serialNumber.trim().toUpperCase() : null;
    if (normSerial) {
      const serialClash = (await c.query(
        'SELECT 1 FROM fixed_assets WHERE tenant_id = $1 AND UPPER(TRIM(serial_number)) = $2',
        [req.tenantId, normSerial]
      )).rowCount;
      if (serialClash) throw new AppError('An asset with this serial number already exists in this institution.', 409, 'SERIAL_NUMBER_EXISTS');
    }

    const r = (await c.query(
      `INSERT INTO fixed_assets(
         tenant_id, asset_tag, name, category_id, location_id, branch_id, vendor_id,
         serial_number, purchase_date, purchase_cost, warranty_expiry, condition, status, notes
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'AVAILABLE', $13) RETURNING *`,
      [
        req.tenantId, b.assetTag, b.name, b.categoryId, b.locationId || null, b.branchId || null, b.vendorId || null,
        normSerial, b.purchaseDate || null, b.purchaseCost, b.warrantyExpiry || null, b.condition, b.notes || null
      ]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'FIXED_ASSET_CREATED', r.id);
    return r;
  });
  res.status(201).json({ data });
}));

router.patch('/assets/:id', validateId, requirePermission('assets.manage'), validateBody(z.object({
  name: text.optional(),
  categoryId: id.optional(),
  locationId: id.optional().nullable(),
  branchId: id.optional().nullable(),
  serialNumber: z.string().trim().max(100).optional().nullable(),
  condition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const old = (await c.query('SELECT * FROM fixed_assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!old) throw new AppError('Asset not found.', 404, 'NOT_FOUND');
    if (old.status === 'DISPOSED') throw new AppError('Disposed assets cannot be modified.', 409, 'ASSET_DISPOSED');

    if (b.categoryId && !(await c.query('SELECT 1 FROM inventory_categories WHERE id = $1 AND tenant_id = $2', [b.categoryId, req.tenantId])).rowCount) {
      throw new AppError('Category not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.locationId && !(await c.query('SELECT 1 FROM inventory_locations WHERE id = $1 AND tenant_id = $2', [b.locationId, req.tenantId])).rowCount) {
      throw new AppError('Location not found.', 422, 'INVALID_REFERENCE');
    }
    if (b.branchId && !(await c.query('SELECT 1 FROM branches WHERE id = $1 AND tenant_id = $2', [b.branchId, req.tenantId])).rowCount) {
      throw new AppError('Branch not found.', 422, 'INVALID_REFERENCE');
    }

    let normSerial: string | null = old.serial_number;
    if (b.serialNumber !== undefined) {
      normSerial = b.serialNumber && b.serialNumber.trim() ? b.serialNumber.trim().toUpperCase() : null;
      if (normSerial) {
        const serialClash = (await c.query(
          'SELECT 1 FROM fixed_assets WHERE tenant_id = $1 AND UPPER(TRIM(serial_number)) = $2 AND id <> $3',
          [req.tenantId, normSerial, old.id]
        )).rowCount;
        if (serialClash) throw new AppError('An asset with this serial number already exists in this institution.', 409, 'SERIAL_NUMBER_EXISTS');
      }
    }

    const r = (await c.query(
      `UPDATE fixed_assets SET
         name = $3, category_id = $4, location_id = $5, branch_id = $6,
         serial_number = $7, condition = $8, notes = $9, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        old.id, req.tenantId,
        b.name ?? old.name,
        b.categoryId ?? old.category_id,
        b.locationId !== undefined ? b.locationId : old.location_id,
        b.branchId !== undefined ? b.branchId : old.branch_id,
        normSerial,
        b.condition ?? old.condition,
        b.notes !== undefined ? b.notes : old.notes,
      ]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'FIXED_ASSET_UPDATED', r.id, b);
    return r;
  });
  res.json({ data });
}));

// Asset Assignment: AVAILABLE -> ASSIGNED
router.post('/assets/:id/assign', validateId, requirePermission('assets.assign'), validateBody(z.object({
  custodianId: id,
  notes: z.string().trim().max(1000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const asset = (await c.query('SELECT * FROM fixed_assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!asset) throw new AppError('Asset not found.', 404, 'NOT_FOUND');
    if (asset.status !== 'AVAILABLE') {
      throw new AppError(`Cannot assign asset in status ${asset.status}; asset must be AVAILABLE.`, 409, 'INVALID_ASSET_TRANSITION');
    }

    const custodian = (await c.query(`SELECT id, name FROM staff WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'`, [b.custodianId, req.tenantId])).rows[0];
    if (!custodian) throw new AppError('Active staff custodian not found.', 422, 'INVALID_CUSTODIAN');

    const updated = (await c.query(
      `UPDATE fixed_assets SET status = 'ASSIGNED', custodian_id = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [asset.id, req.tenantId, custodian.id]
    )).rows[0];

    await c.query(
      `INSERT INTO asset_custodian_history(tenant_id, asset_id, custodian_id, assigned_at, condition_at_assignment, notes, assigned_by)
       VALUES($1, $2, $3, NOW(), $4, $5, $6)`,
      [req.tenantId, asset.id, custodian.id, asset.condition, b.notes || null, req.user.id]
    );

    await logOperation(req, c, 'inventory', 'ASSET_ASSIGNED', asset.id, { custodianId: custodian.id, custodianName: custodian.name });
    return updated;
  });
  res.json({ data });
}));

// Asset Return: ASSIGNED -> AVAILABLE (or DAMAGED)
router.post('/assets/:id/return', validateId, requirePermission('assets.assign'), validateBody(z.object({
  condition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const asset = (await c.query('SELECT * FROM fixed_assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!asset) throw new AppError('Asset not found.', 404, 'NOT_FOUND');
    if (asset.status !== 'ASSIGNED') {
      throw new AppError(`Cannot return asset in status ${asset.status}; asset must be ASSIGNED.`, 409, 'INVALID_ASSET_TRANSITION');
    }

    const finalCondition = b.condition || asset.condition;
    const finalStatus = finalCondition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';

    await c.query(
      `UPDATE asset_custodian_history
       SET returned_at = NOW(), condition_at_return = $3, notes = COALESCE($4, notes)
       WHERE asset_id = $1 AND tenant_id = $2 AND returned_at IS NULL`,
      [asset.id, req.tenantId, finalCondition, b.notes || null]
    );

    const updated = (await c.query(
      `UPDATE fixed_assets SET status = $3, custodian_id = NULL, condition = $4, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [asset.id, req.tenantId, finalStatus, finalCondition]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'ASSET_RETURNED', asset.id, { finalStatus, finalCondition });
    return updated;
  });
  res.json({ data });
}));

// Asset Maintenance: Start Maintenance (AVAILABLE or DAMAGED -> UNDER_MAINTENANCE)
router.post('/assets/:id/maintenance-start', validateId, requirePermission('assets.manage'), validateBody(z.object({
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'AMC_SERVICE', 'INSPECTION', 'REPAIR']),
  serviceProvider: z.string().trim().max(200).optional().nullable(),
  details: z.string().trim().min(3).max(2000),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const asset = (await c.query('SELECT * FROM fixed_assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!asset) throw new AppError('Asset not found.', 404, 'NOT_FOUND');
    if (['DISPOSED', 'LOST'].includes(asset.status)) {
      throw new AppError(`Cannot start maintenance for terminal asset in status ${asset.status}.`, 409, 'INVALID_ASSET_TRANSITION');
    }
    if (!['AVAILABLE', 'DAMAGED'].includes(asset.status)) {
      throw new AppError(`Cannot start maintenance for asset in status ${asset.status}. Must be AVAILABLE or DAMAGED.`, 409, 'INVALID_ASSET_TRANSITION');
    }

    // Enforce at most one active maintenance record per asset
    const activeMaint = (await c.query(
      `SELECT 1 FROM asset_maintenance_records WHERE asset_id = $1 AND tenant_id = $2 AND status IN ('SCHEDULED', 'IN_PROGRESS')`,
      [asset.id, req.tenantId]
    )).rowCount;
    if (activeMaint) {
      throw new AppError('An active maintenance workflow already exists for this asset.', 409, 'ACTIVE_MAINTENANCE_EXISTS');
    }

    const updated = (await c.query(
      `UPDATE fixed_assets SET status = 'UNDER_MAINTENANCE', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [asset.id, req.tenantId]
    )).rows[0];

    const maintenance = (await c.query(
      `INSERT INTO asset_maintenance_records(
         tenant_id, asset_id, maintenance_type, status, service_provider, details, start_date, performed_by
       ) VALUES($1, $2, $3, 'IN_PROGRESS', $4, $5, CURRENT_DATE, $6) RETURNING *`,
      [req.tenantId, asset.id, b.maintenanceType, b.serviceProvider || null, b.details, req.user.id]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'ASSET_MAINTENANCE_STARTED', asset.id, { maintenanceId: maintenance.id });
    return { asset: updated, maintenance };
  });
  res.json({ data });
}));

// Asset Maintenance: Complete Maintenance (UNDER_MAINTENANCE -> AVAILABLE or DAMAGED)
router.post('/assets/:id/maintenance-complete', validateId, requirePermission('assets.manage'), validateBody(z.object({
  outcome: z.string().trim().min(3).max(2000),
  cost: z.number().min(0).optional().default(0),
  condition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
  failed: z.boolean().optional().default(false),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const asset = (await c.query('SELECT * FROM fixed_assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!asset) throw new AppError('Asset not found.', 404, 'NOT_FOUND');
    if (asset.status === 'DISPOSED') {
      throw new AppError('Cannot complete maintenance on a disposed asset.', 409, 'ASSET_DISPOSED');
    }
    if (asset.status !== 'UNDER_MAINTENANCE') {
      throw new AppError(`Cannot complete maintenance for asset in status ${asset.status}. Asset must be UNDER_MAINTENANCE.`, 409, 'INVALID_ASSET_TRANSITION');
    }

    // Lock exact active maintenance record
    const maintRecord = (await c.query(
      `SELECT * FROM asset_maintenance_records WHERE asset_id = $1 AND tenant_id = $2 AND status IN ('SCHEDULED', 'IN_PROGRESS') FOR UPDATE`,
      [asset.id, req.tenantId]
    )).rows[0];
    if (!maintRecord) {
      throw new AppError('No active maintenance record found for this asset.', 409, 'NO_ACTIVE_MAINTENANCE');
    }

    const finalStatus = b.failed ? 'DAMAGED' : 'AVAILABLE';
    const finalCondition = b.failed ? 'DAMAGED' : (b.condition || 'GOOD');

    await c.query(
      `UPDATE asset_maintenance_records
       SET status = 'COMPLETED', completion_date = CURRENT_DATE, cost = $3, outcome = $4
       WHERE id = $1 AND tenant_id = $2`,
      [maintRecord.id, req.tenantId, b.cost, b.outcome]
    );

    const updated = (await c.query(
      `UPDATE fixed_assets SET status = $3, condition = $4, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [asset.id, req.tenantId, finalStatus, finalCondition]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'ASSET_MAINTENANCE_COMPLETED', asset.id, { finalStatus, finalCondition, cost: b.cost });
    return updated;
  });
  res.json({ data });
}));

// Asset Disposal: Write-off / Dispose (AVAILABLE, DAMAGED, UNDER_MAINTENANCE -> DISPOSED)
router.post('/assets/:id/dispose', validateId, requirePermission('assets.dispose'), validateBody(z.object({
  reason: z.string().trim().min(3).max(2000),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const asset = (await c.query('SELECT * FROM fixed_assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!asset) throw new AppError('Asset not found.', 404, 'NOT_FOUND');
    if (asset.status === 'DISPOSED') {
      throw new AppError('Asset is already disposed.', 409, 'ALREADY_DISPOSED');
    }
    if (asset.status === 'ASSIGNED') {
      throw new AppError('Cannot dispose an assigned asset. Return asset from custodian first.', 409, 'INVALID_ASSET_TRANSITION');
    }

    // Atomically close any active maintenance record associated with this asset
    await c.query(
      `UPDATE asset_maintenance_records
       SET status = 'CANCELLED', outcome = 'TERMINATED_BY_DISPOSAL', completion_date = CURRENT_DATE,
           details = details || ' [Terminated by asset disposal]', notes = COALESCE(notes || ' | ', '') || 'Terminated by asset disposal'
       WHERE asset_id = $1 AND tenant_id = $2 AND status IN ('SCHEDULED', 'IN_PROGRESS')`,
      [asset.id, req.tenantId]
    );

    const updated = (await c.query(
      `UPDATE fixed_assets
       SET status = 'DISPOSED', custodian_id = NULL, disposal_date = CURRENT_DATE, disposal_reason = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [asset.id, req.tenantId, b.reason]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'ASSET_DISPOSED', asset.id, { reason: b.reason });
    return updated;
  });
  res.json({ data });
}));


// Asset Mark Lost
router.post('/assets/:id/lost', validateId, requirePermission('assets.manage'), validateBody(z.object({
  reason: z.string().trim().min(3).max(2000),
})), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const asset = (await c.query('SELECT * FROM fixed_assets WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [req.params.id, req.tenantId])).rows[0];
    if (!asset) throw new AppError('Asset not found.', 404, 'NOT_FOUND');
    if (['DISPOSED', 'LOST'].includes(asset.status)) {
      throw new AppError(`Cannot mark asset as lost in status ${asset.status}.`, 409, 'INVALID_ASSET_TRANSITION');
    }

    const updated = (await c.query(
      `UPDATE fixed_assets
       SET status = 'LOST', custodian_id = NULL, notes = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [asset.id, req.tenantId, b.reason]
    )).rows[0];

    await logOperation(req, c, 'inventory', 'ASSET_MARKED_LOST', asset.id, { reason: b.reason });
    return updated;
  });
  res.json({ data });
}));

router.use((_req, _res, next) => next(new AppError('Inventory endpoint not found.', 404, 'NOT_FOUND')));
router.use(operationError);

export default router;
