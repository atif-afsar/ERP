import React, { useState, useMemo } from 'react';
import {
  Package,
  Boxes,
  Truck,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Building,
  Wrench,
  Calendar,
  Layers,
  ShieldCheck,
  X,
  FileText,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  InventoryItem,
  InventoryCategory,
  Warehouse,
  StockMovement,
  FixedAsset,
  AssetMaintenanceRecord,
  StockMovementType,
  AssetStatus,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const InventoryModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const { currentUser, can } = useAuth();

  // Primary State
  const [items, setItems] = useState<InventoryItem[]>(() =>
    storage.getInventoryItems(currentTenant.id)
  );
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() =>
    storage.getWarehouses(currentTenant.id)
  );
  const [categories, setCategories] = useState<InventoryCategory[]>(() =>
    storage.getInventoryCategories(currentTenant.id)
  );
  const [movements, setMovements] = useState<StockMovement[]>(() =>
    storage.getStockMovements(currentTenant.id)
  );
  const [assets, setAssets] = useState<FixedAsset[]>(() =>
    storage.getFixedAssets(currentTenant.id)
  );
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>(() =>
    storage.getAssetMaintenance(currentTenant.id)
  );

  // Tabs
  const [activeTab, setActiveTab] = useState<
    'items' | 'movements' | 'warehouses' | 'assets' | 'maintenance'
  >('items');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isRecordMovementModalOpen, setIsRecordMovementModalOpen] = useState(false);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [isAddMaintenanceModalOpen, setIsAddMaintenanceModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Movement Form
  const [movementForm, setMovementForm] = useState({
    itemId: items[0]?.id || '',
    type: 'STOCK_OUT' as StockMovementType,
    quantity: 5,
    recipient: 'Class 10 Examination Block',
    vendorName: '',
    referenceDoc: `ISSUE-${Date.now().toString().slice(-5)}`,
    remarks: 'Routine academic material requisition',
  });

  // New Item Form
  const [itemForm, setItemForm] = useState({
    sku: `STN-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    categoryId: categories[0]?.id || '',
    warehouseId: warehouses[0]?.id || '',
    unit: 'BOX' as const,
    currentStock: 50,
    minimumStock: 10,
    reorderLevel: 20,
    unitPrice: 150,
  });

  // New Asset Form
  const [assetForm, setAssetForm] = useState({
    assetCode: `AST-IT-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    category: 'Computers & IT',
    location: 'Computer Laboratory 1',
    custodian: 'IT Systems Administrator',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 45000,
    vendorName: 'National Technology Hardware',
    warrantyExpiry: '2028-12-31',
    status: 'ACTIVE' as AssetStatus,
  });

  // Maintenance Form
  const [maintenanceForm, setMaintenanceForm] = useState({
    assetId: assets[0]?.id || '',
    type: 'PREVENTIVE' as const,
    serviceProvider: 'Authorized Service Partner',
    cost: 3500,
    details: 'Quarterly hardware diagnostics and thermal paste replenishment',
    performedBy: 'External Service Engineer',
    status: 'COMPLETED' as const,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPIs
  const totalStockValue = useMemo(
    () => items.reduce((acc, i) => acc + i.totalValue, 0),
    [items]
  );
  const lowStockCount = useMemo(
    () => items.filter((i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK').length,
    [items]
  );
  const totalAssetsValue = useMemo(
    () => assets.reduce((acc, a) => acc + a.purchaseCost, 0),
    [assets]
  );

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'ALL' || item.categoryId === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  // 1. Record Stock Movement (Document 56 Section 25-28)
  const handleRecordMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find((i) => i.id === movementForm.itemId);
    if (!item) return;

    if (movementForm.type === 'STOCK_OUT' && item.currentStock < movementForm.quantity) {
      alert(`Insufficient stock! Current stock is only ${item.currentStock} ${item.unit}.`);
      return;
    }

    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      tenantId: currentTenant.id,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      type: movementForm.type,
      quantity: Number(movementForm.quantity),
      unit: item.unit,
      sourceWarehouseId: movementForm.type === 'STOCK_OUT' ? item.warehouseId : undefined,
      destWarehouseId: movementForm.type === 'STOCK_IN' ? item.warehouseId : undefined,
      recipient: movementForm.type === 'STOCK_OUT' ? movementForm.recipient : undefined,
      vendorName: movementForm.type === 'STOCK_IN' ? movementForm.vendorName : undefined,
      referenceDoc: movementForm.referenceDoc,
      costPerUnit: item.unitPrice,
      totalCost: item.unitPrice * Number(movementForm.quantity),
      movementDate: new Date().toISOString().split('T')[0],
      recordedBy: currentUser.name,
      remarks: movementForm.remarks,
    };

    storage.recordStockMovement(movement);
    setItems(storage.getInventoryItems(currentTenant.id));
    setMovements(storage.getStockMovements(currentTenant.id));
    setIsRecordMovementModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'STOCK_MOVEMENT',
      category: 'INVENTORY',
      entityType: 'INVENTORY_ITEM',
      entityId: item.id,
      details: `${movementForm.type} recorded for ${movement.quantity} ${item.unit} of ${item.name} (${item.sku}). Ref: ${movement.referenceDoc}.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Stock movement recorded: ${movement.type} for ${movement.quantity} ${item.unit}.`);
  };

  // 2. Create Inventory Item
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === itemForm.categoryId) || categories[0];
    const wh = warehouses.find((w) => w.id === itemForm.warehouseId) || warehouses[0];
    const curStock = Number(itemForm.currentStock);
    const minStock = Number(itemForm.minimumStock);
    const reorder = Number(itemForm.reorderLevel);
    const price = Number(itemForm.unitPrice);

    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      tenantId: currentTenant.id,
      sku: itemForm.sku,
      name: itemForm.name,
      categoryId: cat.id,
      categoryName: cat.name,
      warehouseId: wh.id,
      warehouseName: wh.name,
      unit: itemForm.unit,
      currentStock: curStock,
      minimumStock: minStock,
      reorderLevel: reorder,
      unitPrice: price,
      totalValue: curStock * price,
      status: curStock === 0 ? 'OUT_OF_STOCK' : curStock <= reorder ? 'LOW_STOCK' : 'IN_STOCK',
    };

    storage.saveInventoryItem(newItem);
    setItems(storage.getInventoryItems(currentTenant.id));
    setIsAddItemModalOpen(false);
    showToast(`Created inventory item '${newItem.name}' (${newItem.sku}).`);
  };

  // 3. Create Fixed Asset
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsset: FixedAsset = {
      id: `ast-${Date.now()}`,
      tenantId: currentTenant.id,
      assetCode: assetForm.assetCode,
      name: assetForm.name,
      category: assetForm.category,
      location: assetForm.location,
      custodian: assetForm.custodian,
      purchaseDate: assetForm.purchaseDate,
      purchaseCost: Number(assetForm.purchaseCost),
      vendorName: assetForm.vendorName,
      warrantyExpiry: assetForm.warrantyExpiry,
      status: assetForm.status,
    };

    storage.saveFixedAsset(newAsset);
    setAssets(storage.getFixedAssets(currentTenant.id));
    setIsAddAssetModalOpen(false);
    showToast(`Registered capital asset '${newAsset.name}' (${newAsset.assetCode}).`);
  };

  // 4. Record Asset Maintenance
  const handleRecordMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const ast = assets.find((a) => a.id === maintenanceForm.assetId);
    if (!ast) return;

    const record: AssetMaintenanceRecord = {
      id: `maint-${Date.now()}`,
      tenantId: currentTenant.id,
      assetId: ast.id,
      assetCode: ast.assetCode,
      assetName: ast.name,
      maintenanceDate: new Date().toISOString().split('T')[0],
      type: maintenanceForm.type,
      serviceProvider: maintenanceForm.serviceProvider,
      cost: Number(maintenanceForm.cost),
      details: maintenanceForm.details,
      performedBy: maintenanceForm.performedBy,
      status: maintenanceForm.status,
    };

    storage.recordAssetMaintenance(record);
    setAssets(storage.getFixedAssets(currentTenant.id));
    setMaintenanceRecords(storage.getAssetMaintenance(currentTenant.id));
    setIsAddMaintenanceModalOpen(false);
    showToast(`Servicing log updated for ${ast.assetCode}.`);
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Flash Toast */}
      {toastMsg && (
        <div className="no-print p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg shadow-emerald-950/20 animate-slide-down">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="no-print p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-600/20 border border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/10">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Inventory & Asset Management
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    Doc 56 Canonical
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consumable stock tracking, multi-warehouse stores, stock-in/stock-out distribution, and capital asset register.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Truck className="w-4 h-4" />}
              onClick={() => setIsRecordMovementModalOpen(true)}
            >
              Issue / Receive Stock
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddItemModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950/20"
            >
              Add Inventory Item
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Tabs
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
            tabs={[
              { id: 'items', label: 'Consumables Ledger', count: items.length },
              { id: 'movements', label: 'Stock Movements Desk', count: movements.length },
              { id: 'warehouses', label: 'Warehouses & Stores', count: warehouses.length },
              { id: 'assets', label: 'Fixed Capital Assets', count: assets.length },
              { id: 'maintenance', label: 'Asset Maintenance & AMC', count: maintenanceRecords.length },
            ]}
          />
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total SKUs</span>
          <h3 className="text-2xl font-black text-white font-mono">{items.length} Items</h3>
          <p className="text-[11px] text-slate-400">Consumables & academic supplies</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Inventory Valuation</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">₹{totalStockValue.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-400">Current warehouse stock valuation</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Low Stock Alerts</span>
          <h3 className="text-2xl font-black text-amber-400 font-mono">{lowStockCount} Items</h3>
          <p className="text-[11px] text-slate-400">At or below reorder threshold</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">Fixed Assets Book</span>
          <h3 className="text-2xl font-black text-sky-400 font-mono">₹{totalAssetsValue.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-400">{assets.length} capital assets tagged</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CONSUMABLE INVENTORY LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by SKU or item name..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Status:</span>
              {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">SKU & Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Warehouse Location</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Reorder Level</th>
                    <th className="py-3 px-4 text-center">Total Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block text-sm">{item.name}</span>
                        <span className="font-mono text-amber-400 text-[11px] font-bold">{item.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.categoryName}</td>
                      <td className="py-3 px-4 text-slate-400">{item.warehouseName}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-200">{item.unit}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sm text-white">
                        {item.currentStock}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{item.reorderLevel}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{item.totalValue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            item.status === 'IN_STOCK'
                              ? 'emerald'
                              : item.status === 'LOW_STOCK'
                              ? 'amber'
                              : 'rose'
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: STOCK MOVEMENTS DESK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'movements' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Stock Movement Log (Stock In / Out / Adjustments)</h3>
              <p className="text-xs text-slate-400">
                Audited material distribution to academic departments and incoming supplier deliveries.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsRecordMovementModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500"
            >
              Record Movement
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4 text-center">Quantity</th>
                    <th className="py-3 px-4">Recipient / Supplier</th>
                    <th className="py-3 px-4">Voucher Reference</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{m.movementDate}</td>
                      <td className="py-3 px-4">
                        <Badge variant={m.type === 'STOCK_IN' ? 'emerald' : m.type === 'STOCK_OUT' ? 'rose' : 'purple'}>
                          {m.type === 'STOCK_IN' ? 'RECEIVE IN' : m.type === 'STOCK_OUT' ? 'DISPATCH OUT' : 'ADJUSTMENT'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{m.itemName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{m.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white text-sm">
                        {m.type === 'STOCK_OUT' ? `-${m.quantity}` : `+${m.quantity}`} {m.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{m.recipient || m.vendorName || 'Internal Warehouse'}</td>
                      <td className="py-3 px-4 font-mono text-sky-400">{m.referenceDoc}</td>
                      <td className="py-3 px-4 text-slate-400">{m.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: WAREHOUSES & STORES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {warehouses.map((wh) => {
              const whItems = items.filter((i) => i.warehouseId === wh.id);
              const whVal = whItems.reduce((a, b) => a + b.totalValue, 0);

              return (
                <div key={wh.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{wh.name}</h4>
                      <p className="text-xs text-slate-400">{wh.location}</p>
                    </div>
                    <Badge variant="purple">{wh.code}</Badge>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase">Storage Custodian</span>
                    <p className="font-bold text-white">{wh.custodian}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">{whItems.length} Unique SKUs:</span>
                    <span className="font-mono font-bold text-emerald-400">₹{whVal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: FIXED ASSET REGISTER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Institutional Capital Asset Register (Section 32-35)</h3>
              <p className="text-xs text-slate-400">
                Track tagged institutional property, campus room locations, custodians, and warranty expiration.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddAssetModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-500"
            >
              Tag Capital Asset
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Asset Tag</th>
                    <th className="py-3 px-4">Asset Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Location / Room</th>
                    <th className="py-3 px-4">Custodian</th>
                    <th className="py-3 px-4 text-center">Purchase Cost</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {assets.map((ast) => (
                    <tr key={ast.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{ast.assetCode}</td>
                      <td className="py-3 px-4 font-bold text-white">{ast.name}</td>
                      <td className="py-3 px-4 text-slate-300">{ast.category}</td>
                      <td className="py-3 px-4 text-slate-400">{ast.location}</td>
                      <td className="py-3 px-4 text-slate-300">{ast.custodian}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{ast.purchaseCost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            ast.status === 'ACTIVE'
                              ? 'emerald'
                              : ast.status === 'IN_MAINTENANCE'
                              ? 'amber'
                              : 'rose'
                          }
                        >
                          {ast.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: ASSET MAINTENANCE & AMC */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Equipment Maintenance & Servicing Records</h3>
              <p className="text-xs text-slate-400">
                Scheduled AMC servicing, corrective repairs, and maintenance vendor costs.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Wrench className="w-3.5 h-3.5" />}
              onClick={() => setIsAddMaintenanceModalOpen(true)}
            >
              Record Equipment Service
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Service Date</th>
                    <th className="py-3 px-4">Asset Code</th>
                    <th className="py-3 px-4">Equipment Description</th>
                    <th className="py-3 px-4">Maintenance Type</th>
                    <th className="py-3 px-4">Service Provider</th>
                    <th className="py-3 px-4 text-center">Cost (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {maintenanceRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{rec.maintenanceDate}</td>
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{rec.assetCode}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{rec.assetName}</span>
                        <span className="text-[11px] text-slate-400">{rec.details}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{rec.type}</td>
                      <td className="py-3 px-4 text-slate-300">{rec.serviceProvider}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                        ₹{rec.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={rec.status === 'COMPLETED' ? 'emerald' : 'amber'}>
                          {rec.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD INVENTORY ITEM */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} title="Register Consumable Inventory Item">
        <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">SKU Code</label>
              <input
                type="text"
                required
                value={itemForm.sku}
                onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Item Display Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Spiral Note Pad A5"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Warehouse Store</label>
              <select
                value={itemForm.warehouseId}
                onChange={(e) => setItemForm({ ...itemForm, warehouseId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Initial Stock</label>
              <input
                type="number"
                required
                min={0}
                value={itemForm.currentStock}
                onChange={(e) => setItemForm({ ...itemForm, currentStock: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Reorder Level</label>
              <input
                type="number"
                required
                min={1}
                value={itemForm.reorderLevel}
                onChange={(e) => setItemForm({ ...itemForm, reorderLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Unit Price (₹)</label>
              <input
                type="number"
                required
                min={1}
                value={itemForm.unitPrice}
                onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddItemModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-amber-600 hover:bg-amber-500">
              Save Inventory Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RECORD STOCK MOVEMENT */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isRecordMovementModalOpen} onClose={() => setIsRecordMovementModalOpen(false)} title="Record Stock Movement Desk">
        <form onSubmit={handleRecordMovement} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Item</label>
            <select
              value={movementForm.itemId}
              onChange={(e) => setMovementForm({ ...movementForm, itemId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku}) - Current Stock: {i.currentStock} {i.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Movement Type</label>
              <select
                value={movementForm.type}
                onChange={(e: any) => setMovementForm({ ...movementForm, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="STOCK_OUT">Stock Out (Issue to Department/Faculty)</option>
                <option value="STOCK_IN">Stock In (Receive from Supplier Delivery)</option>
                <option value="ADJUSTMENT">Stock Audit Adjustment (Audit Count)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Quantity</label>
              <input
                type="number"
                required
                min={1}
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                {movementForm.type === 'STOCK_IN' ? 'Supplier Name' : 'Recipient Department / Teacher'}
              </label>
              <input
                type="text"
                required
                value={movementForm.recipient}
                onChange={(e) => setMovementForm({ ...movementForm, recipient: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Reference Doc / PO / Issue No</label>
              <input
                type="text"
                required
                value={movementForm.referenceDoc}
                onChange={(e) => setMovementForm({ ...movementForm, referenceDoc: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsRecordMovementModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-amber-600 hover:bg-amber-500">
              Confirm Movement
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TAG CAPITAL ASSET */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddAssetModalOpen} onClose={() => setIsAddAssetModalOpen(false)} title="Register & Tag Capital Fixed Asset">
        <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Asset Tag Code</label>
              <input
                type="text"
                required
                value={assetForm.assetCode}
                onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Asset Name / Equipment</label>
              <input
                type="text"
                required
                placeholder="e.g. Smart Interactive Flat Panel 75"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Location / Classroom</label>
              <input
                type="text"
                required
                placeholder="e.g. Classroom 10-A, Smart Wing"
                value={assetForm.location}
                onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Custodian Person</label>
              <input
                type="text"
                required
                value={assetForm.custodian}
                onChange={(e) => setAssetForm({ ...assetForm, custodian: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Purchase Cost (₹)</label>
              <input
                type="number"
                required
                min={500}
                value={assetForm.purchaseCost}
                onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Warranty Expiry</label>
              <input
                type="date"
                required
                value={assetForm.warrantyExpiry}
                onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-sky-600 hover:bg-sky-500">
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RECORD ASSET MAINTENANCE */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddMaintenanceModalOpen} onClose={() => setIsAddMaintenanceModalOpen(false)} title="Record Equipment Maintenance & AMC">
        <form onSubmit={handleRecordMaintenance} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Asset</label>
            <select
              value={maintenanceForm.assetId}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, assetId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetCode} - {a.name} ({a.location})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Service Type</label>
              <select
                value={maintenanceForm.type}
                onChange={(e: any) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="PREVENTIVE">Preventive Maintenance</option>
                <option value="CORRECTIVE">Corrective Repair</option>
                <option value="AMC_SERVICE">AMC Scheduled Servicing</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Service Cost (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={maintenanceForm.cost}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Service Details & Replaced Parts</label>
            <textarea
              required
              rows={2}
              value={maintenanceForm.details}
              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, details: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddMaintenanceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Maintenance Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
