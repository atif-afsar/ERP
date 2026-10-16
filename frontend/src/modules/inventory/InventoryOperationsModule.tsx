import React from 'react';
import { OperationsWorkbench, OperationForm, OperationTable } from '../operations/OperationsWorkbench';

const tabs = [
  'Stock Ledger & Balances',
  'Store Transfers',
  'Fixed Asset Register',
  'Master Data'
];

const forms: OperationForm[] = [
  // --- TAB: Stock Ledger & Balances ---
  {
    title: 'Receive stock',
    tab: 'Stock Ledger & Balances',
    path: '/movements',
    permission: 'inventory.transact',
    fields: [
      { name: 'itemId', label: 'Item', type: 'select', source: 'items', filter: (i: any) => i.status === 'ACTIVE' },
      { name: 'locationId', label: 'Receiving Store / Location', type: 'select', source: 'locations' },
      { name: 'quantity', label: 'Quantity to receive', type: 'number', min: 1 },
      { name: 'vendorId', label: 'Supplier / Vendor', type: 'select', source: 'vendors', optional: true },
      { name: 'unitCost', label: 'Unit cost', type: 'number', min: 0, optional: true },
      { name: 'reason', label: 'Receiving reference / invoice / notes' }
    ],
    transform: (b: any) => ({
      ...b,
      type: 'RECEIPT',
      quantity: Number(b.quantity),
      unitCost: b.unitCost !== undefined ? Number(b.unitCost) : 0
    })
  },
  {
    title: 'Issue stock',
    tab: 'Stock Ledger & Balances',
    path: '/movements',
    permission: 'inventory.issue',
    fields: [
      { name: 'itemId', label: 'Item', type: 'select', source: 'items', filter: (i: any) => i.status === 'ACTIVE' && i.stock > 0 },
      { name: 'locationId', label: 'Issuing Store / Location', type: 'select', source: 'locations' },
      { name: 'quantity', label: 'Quantity to issue', type: 'number', min: 1 },
      { name: 'recipientType', label: 'Recipient type', type: 'select', options: ['STAFF', 'STUDENT', 'DEPARTMENT', 'BRANCH', 'OTHER'] },
      { name: 'recipientId', label: 'Staff recipient', type: 'select', source: 'staff', optional: true },
      { name: 'reason', label: 'Purpose of issue / requisition note' }
    ],
    transform: (b: any) => ({
      ...b,
      type: 'ISSUE',
      quantity: Number(b.quantity)
    })
  },
  {
    title: 'Return stock against issue',
    tab: 'Stock Ledger & Balances',
    path: '/movements',
    permission: 'inventory.transact',
    fields: [
      { name: 'sourceIssueId', label: 'Source issue record', type: 'select', source: 'issues' },
      { name: 'itemId', label: 'Item', type: 'select', source: 'items' },
      { name: 'locationId', label: 'Returning Store / Location', type: 'select', source: 'locations' },
      { name: 'quantity', label: 'Quantity returned', type: 'number', min: 1 },
      { name: 'reason', label: 'Return inspection notes / condition' }
    ],
    transform: (b: any) => ({
      ...b,
      type: 'RETURN',
      quantity: Number(b.quantity)
    })
  },
  {
    title: 'Stock adjustment (Audit / Reconciliation)',
    tab: 'Stock Ledger & Balances',
    path: '/movements',
    permission: 'inventory.adjust',
    fields: [
      { name: 'itemId', label: 'Item', type: 'select', source: 'items', filter: (i: any) => i.status === 'ACTIVE' },
      { name: 'locationId', label: 'Store / Location', type: 'select', source: 'locations' },
      { name: 'quantity', label: 'Adjustment quantity delta (positive to add, negative to deduct)', type: 'number' },
      { name: 'reason', label: 'Mandatory audit explanation' }
    ],
    transform: (b: any) => ({
      ...b,
      type: 'ADJUSTMENT',
      quantity: Number(b.quantity)
    })
  },
  {
    title: 'Record damaged or scrap stock',
    tab: 'Stock Ledger & Balances',
    path: '/movements',
    permission: 'inventory.adjust',
    fields: [
      { name: 'itemId', label: 'Item', type: 'select', source: 'items', filter: (i: any) => i.status === 'ACTIVE' && i.stock > 0 },
      { name: 'locationId', label: 'Store / Location', type: 'select', source: 'locations' },
      { name: 'quantity', label: 'Damaged quantity', type: 'number', min: 1 },
      { name: 'reason', label: 'Damage incident report / reason' }
    ],
    transform: (b: any) => ({
      ...b,
      type: 'DAMAGED',
      quantity: Number(b.quantity)
    })
  },

  // --- TAB: Store Transfers ---
  {
    title: 'Transfer stock between stores',
    tab: 'Store Transfers',
    path: '/transfers',
    permission: 'inventory.transact',
    fields: [
      { name: 'itemId', label: 'Item to transfer', type: 'select', source: 'items', filter: (i: any) => i.status === 'ACTIVE' && i.stock > 0 },
      { name: 'sourceLocationId', label: 'Source store', type: 'select', source: 'locations' },
      { name: 'destinationLocationId', label: 'Destination store', type: 'select', source: 'locations' },
      { name: 'quantity', label: 'Transfer quantity', type: 'number', min: 1 },
      { name: 'reason', label: 'Transfer authorization / requisition note' }
    ],
    transform: (b: any) => ({
      ...b,
      quantity: Number(b.quantity)
    })
  },

  // --- TAB: Fixed Asset Register ---
  {
    title: 'Register fixed asset',
    tab: 'Fixed Asset Register',
    path: '/assets',
    permission: 'assets.manage',
    fields: [
      { name: 'assetTag', label: 'Asset tag / barcode' },
      { name: 'name', label: 'Asset name / description' },
      { name: 'categoryId', label: 'Asset category', type: 'select', source: 'categories' },
      { name: 'locationId', label: 'Placement location', type: 'select', source: 'locations', optional: true },
      { name: 'branchId', label: 'Branch', type: 'select', source: 'branches', optional: true },
      { name: 'vendorId', label: 'Supplier / Vendor', type: 'select', source: 'vendors', optional: true },
      { name: 'serialNumber', label: 'Manufacturer serial number', optional: true, helperText: 'Optional unique serial number. Whitespace trimmed, uppercase normalized, unique per institution.' },
      { name: 'purchaseDate', label: 'Purchase date', type: 'date', optional: true },
      { name: 'purchaseCost', label: 'Acquisition cost', type: 'number', min: 0, optional: true },
      { name: 'warrantyExpiry', label: 'Warranty expiry date', type: 'date', optional: true },
      { name: 'condition', label: 'Initial condition', type: 'select', options: ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'] },
      { name: 'notes', label: 'Notes', optional: true }
    ],
    transform: (b: any) => ({
      ...b,
      purchaseCost: b.purchaseCost !== undefined ? Number(b.purchaseCost) : 0
    })
  },
  {
    title: 'Assign asset to custodian',
    tab: 'Fixed Asset Register',
    path: (b: any) => `/assets/${b.id}/assign`,
    method: 'POST',
    permission: 'assets.assign',
    fields: [
      { name: 'id', label: 'Available asset', type: 'select', source: 'assets', filter: (a: any) => a.status === 'AVAILABLE' },
      { name: 'custodianId', label: 'Staff custodian', type: 'select', source: 'staff' },
      { name: 'notes', label: 'Assignment notes / handover terms', optional: true }
    ],
    transform: (b: any) => ({ custodianId: b.custodianId, notes: b.notes })
  },
  {
    title: 'Return asset from custodian',
    tab: 'Fixed Asset Register',
    path: (b: any) => `/assets/${b.id}/return`,
    method: 'POST',
    permission: 'assets.assign',
    fields: [
      { name: 'id', label: 'Assigned asset', type: 'select', source: 'assets', filter: (a: any) => a.status === 'ASSIGNED' },
      { name: 'condition', label: 'Return condition', type: 'select', options: ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'] },
      { name: 'notes', label: 'Inspection return notes', optional: true }
    ],
    transform: (b: any) => ({ condition: b.condition, notes: b.notes })
  },
  {
    title: 'Dispatch asset for maintenance',
    tab: 'Fixed Asset Register',
    path: (b: any) => `/assets/${b.id}/maintenance-start`,
    method: 'POST',
    permission: 'assets.manage',
    fields: [
      { name: 'id', label: 'Asset', type: 'select', source: 'assets', filter: (a: any) => a.status === 'AVAILABLE' || a.status === 'DAMAGED' },
      { name: 'maintenanceType', label: 'Service type', type: 'select', options: ['PREVENTIVE', 'CORRECTIVE', 'AMC_SERVICE', 'INSPECTION', 'REPAIR'] },
      { name: 'serviceProvider', label: 'Service provider / workshop', optional: true },
      { name: 'details', label: 'Defect description / service requirements' }
    ],
    transform: (b: any) => ({ maintenanceType: b.maintenanceType, serviceProvider: b.serviceProvider, details: b.details })
  },
  {
    title: 'Complete asset maintenance',
    tab: 'Fixed Asset Register',
    path: (b: any) => `/assets/${b.id}/maintenance-complete`,
    method: 'POST',
    permission: 'assets.manage',
    fields: [
      { name: 'id', label: 'Asset under maintenance', type: 'select', source: 'assets', filter: (a: any) => a.status === 'UNDER_MAINTENANCE' },
      { name: 'outcome', label: 'Repair outcome / service summary' },
      { name: 'cost', label: 'Maintenance cost', type: 'number', min: 0, optional: true },
      { name: 'condition', label: 'Resulting condition', type: 'select', options: ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'] },
      { name: 'failed', label: 'Did repair fail? (Leaves asset as DAMAGED)', type: 'select', options: ['No', 'Yes'], optional: true }
    ],
    transform: (b: any) => ({
      outcome: b.outcome,
      cost: b.cost !== undefined ? Number(b.cost) : 0,
      condition: b.condition,
      failed: b.failed === 'Yes'
    })
  },
  {
    title: 'Dispose or write off asset',
    tab: 'Fixed Asset Register',
    path: (b: any) => `/assets/${b.id}/dispose`,
    method: 'POST',
    permission: 'assets.dispose',
    fields: [
      { name: 'id', label: 'Asset to dispose', type: 'select', source: 'assets', filter: (a: any) => a.status !== 'DISPOSED' && a.status !== 'ASSIGNED' },
      { name: 'reason', label: 'Authorized disposal reason / scrap justification', helperText: 'Terminal action. If this asset is currently UNDER_MAINTENANCE, its active maintenance record will be atomically closed (TERMINATED_BY_DISPOSAL).' }
    ],
    transform: (b: any) => ({ reason: b.reason })
  },

  // --- TAB: Master Data ---
  {
    title: 'Add inventory item',
    tab: 'Master Data',
    path: '/items',
    permission: 'inventory.manage',
    fields: [
      { name: 'name', label: 'Item name' },
      { name: 'sku', label: 'SKU / item code', optional: true },
      { name: 'categoryId', label: 'Category', type: 'select', source: 'categories' },
      { name: 'itemType', label: 'Item classification', type: 'select', options: ['CONSUMABLE', 'ASSET'] },
      { name: 'unit', label: 'Unit of measure (e.g. pcs, reams, kg, boxes)' },
      { name: 'minStockAlert', label: 'Reorder / low-stock alert threshold', type: 'number', min: 0 },
      { name: 'branchId', label: 'Branch', type: 'select', source: 'branches', optional: true },
      { name: 'vendorId', label: 'Default supplier', type: 'select', source: 'vendors', optional: true }
    ],
    transform: (b: any) => ({ ...b, minStockAlert: Number(b.minStockAlert) })
  },
  {
    title: 'Update item status',
    tab: 'Master Data',
    path: (b: any) => `/items/${b.id}`,
    method: 'PATCH',
    permission: 'inventory.manage',
    fields: [
      { name: 'id', label: 'Item', type: 'select', source: 'items' },
      { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] }
    ],
    transform: (b: any) => ({ status: b.status })
  },
  {
    title: 'Add category',
    tab: 'Master Data',
    path: '/categories',
    permission: 'inventory.manage',
    fields: [{ name: 'name', label: 'Category name' }]
  },
  {
    title: 'Add storage location / store',
    tab: 'Master Data',
    path: '/locations',
    permission: 'inventory.manage',
    fields: [{ name: 'name', label: 'Store name' }]
  },
  {
    title: 'Add supplier / vendor',
    tab: 'Master Data',
    path: '/vendors',
    permission: 'inventory.manage',
    fields: [
      { name: 'name', label: 'Vendor company name' },
      { name: 'contactPerson', label: 'Contact person', optional: true },
      { name: 'email', label: 'Email address', optional: true },
      { name: 'phone', label: 'Phone number', optional: true },
      { name: 'address', label: 'Office address', optional: true }
    ]
  }
];

const tables: OperationTable[] = [
  // --- TAB: Stock Ledger & Balances ---
  {
    title: 'Items & Stock on Hand',
    tab: 'Stock Ledger & Balances',
    source: 'items',
    columns: {
      name: 'Item',
      sku: 'SKU',
      item_type: 'Classification',
      category: 'Category',
      stock: 'Stock on Hand',
      unit: 'Unit',
      min_stock_alert: 'Reorder Level',
      low_stock: 'Low Stock Alert',
      status: 'Status'
    },
    action: {
      label: 'Archive',
      permission: 'inventory.manage',
      method: 'PATCH',
      path: (r: any) => `/items/${r.id}`,
      body: () => ({ status: 'ARCHIVED' }),
      show: (r: any) => r.status === 'ACTIVE'
    }
  },
  {
    title: 'Stock Balances by Store Location',
    tab: 'Stock Ledger & Balances',
    source: 'balances',
    columns: {
      item_name: 'Item',
      location_name: 'Store Location',
      stock: 'Quantity Available'
    }
  },
  {
    title: 'Immutable Movement Ledger',
    tab: 'Stock Ledger & Balances',
    source: 'movements',
    columns: {
      item_name: 'Item',
      location_name: 'Origin Store',
      dest_location_name: 'Destination Store',
      type: 'Movement Type',
      quantity_delta: 'Delta',
      reason: 'Reason / Ref',
      created_at: 'Timestamp'
    }
  },

  // --- TAB: Store Transfers ---
  {
    title: 'Store Location Balances',
    tab: 'Store Transfers',
    source: 'balances',
    columns: {
      item_name: 'Item',
      location_name: 'Store Location',
      stock: 'Stock'
    }
  },
  {
    title: 'Recent Store Transfers & Movements',
    tab: 'Store Transfers',
    source: 'movements',
    columns: {
      item_name: 'Item',
      location_name: 'Location',
      type: 'Type',
      quantity_delta: 'Quantity',
      reason: 'Reason',
      created_at: 'Date'
    }
  },

  // --- TAB: Fixed Asset Register ---
  {
    title: 'Fixed Asset Register',
    tab: 'Fixed Asset Register',
    source: 'assets',
    columns: {
      asset_tag: 'Asset Tag',
      name: 'Asset Name',
      serial_number: 'Serial Number',
      category_name: 'Category',
      status: 'Lifecycle Status',
      condition: 'Condition',
      custodian_name: 'Assigned Custodian',
      location_name: 'Location',
      purchase_date: 'Purchased',
      purchase_cost: 'Cost',
      warranty_expiry: 'Warranty'
    }
  },
  {
    title: 'Asset Maintenance History',
    tab: 'Fixed Asset Register',
    source: 'assetMaintenance',
    columns: {
      asset_tag: 'Asset Tag',
      maintenance_type: 'Service Type',
      status: 'Status',
      service_provider: 'Workshop',
      cost: 'Cost',
      details: 'Details / Outcome',
      start_date: 'Date'
    }
  },
  {
    title: 'Asset Custodian Handover Log',
    tab: 'Fixed Asset Register',
    source: 'assetHistory',
    columns: {
      asset_tag: 'Asset Tag',
      custodian_name: 'Custodian',
      condition_at_assignment: 'Assigned Condition',
      condition_at_return: 'Returned Condition',
      assigned_at: 'Assigned Date',
      returned_at: 'Returned Date',
      notes: 'Notes'
    }
  },

  // --- TAB: Master Data ---
  {
    title: 'Inventory Item Catalog',
    tab: 'Master Data',
    source: 'items',
    columns: {
      name: 'Item',
      sku: 'SKU',
      category: 'Category',
      item_type: 'Type',
      unit: 'Unit',
      min_stock_alert: 'Reorder Level',
      branch_name: 'Branch',
      vendor_name: 'Supplier',
      status: 'Status'
    }
  },
  {
    title: 'Categories',
    tab: 'Master Data',
    source: 'categories',
    columns: { name: 'Category Name' }
  },
  {
    title: 'Store Locations',
    tab: 'Master Data',
    source: 'locations',
    columns: { name: 'Store Location Name' }
  },
  {
    title: 'Suppliers & Vendors',
    tab: 'Master Data',
    source: 'vendors',
    columns: {
      name: 'Vendor Name',
      contact_person: 'Contact',
      email: 'Email',
      phone: 'Phone',
      status: 'Status'
    }
  }
];

export const InventoryOperationsModule: React.FC = () => (
  <OperationsWorkbench
    title="Inventory & Asset Management"
    module="inventory"
    tabs={tabs}
    forms={forms}
    tables={tables}
    note="Authoritative stock balances are strictly calculated from immutable backend movements. Durable fixed assets track custodian custody and maintenance history independently."
  />
);
