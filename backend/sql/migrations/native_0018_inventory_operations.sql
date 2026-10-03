DO $$ BEGIN IF EXISTS(SELECT 1 FROM inventory_items WHERE quantity<0) THEN RAISE EXCEPTION 'Reconcile negative legacy inventory before migration'; END IF; END $$;
ALTER TABLE inventory_items ADD CONSTRAINT inventory_item_tenant_identity UNIQUE(id,tenant_id);
ALTER TABLE inventory_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'CONSUMABLE' CHECK(item_type IN ('CONSUMABLE','ASSET'));
ALTER TABLE inventory_items ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(lifecycle_status IN ('ACTIVE','INACTIVE','ARCHIVED'));
CREATE TABLE inventory_categories(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),name VARCHAR(100) NOT NULL,UNIQUE(id,tenant_id),UNIQUE(tenant_id,name));
CREATE TABLE inventory_locations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),name VARCHAR(100) NOT NULL,UNIQUE(id,tenant_id),UNIQUE(tenant_id,name));
INSERT INTO inventory_categories(tenant_id,name) SELECT DISTINCT tenant_id,category FROM inventory_items;
INSERT INTO inventory_locations(tenant_id,name) SELECT DISTINCT tenant_id,'Legacy store' FROM inventory_items;
ALTER TABLE inventory_items ADD COLUMN category_id UUID;
UPDATE inventory_items i SET category_id=c.id FROM inventory_categories c WHERE c.tenant_id=i.tenant_id AND c.name=i.category;
ALTER TABLE inventory_items ADD FOREIGN KEY(category_id,tenant_id) REFERENCES inventory_categories(id,tenant_id);
CREATE TABLE stock_transactions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),item_id UUID NOT NULL,location_id UUID NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('OPENING','RECEIPT','ISSUE','RETURN','ADJUSTMENT')),quantity_delta INT NOT NULL CHECK(quantity_delta<>0),
 source_issue_id UUID,reason TEXT NOT NULL,recorded_by UUID REFERENCES users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(id,tenant_id,item_id,location_id),
 FOREIGN KEY(item_id,tenant_id) REFERENCES inventory_items(id,tenant_id),FOREIGN KEY(location_id,tenant_id) REFERENCES inventory_locations(id,tenant_id),
 FOREIGN KEY(source_issue_id,tenant_id,item_id,location_id) REFERENCES stock_transactions(id,tenant_id,item_id,location_id),
 CHECK((type='ISSUE' AND quantity_delta<0) OR (type IN ('OPENING','RECEIPT','RETURN') AND quantity_delta>0) OR type='ADJUSTMENT'),
 CHECK((type='RETURN' AND source_issue_id IS NOT NULL) OR (type<>'RETURN' AND source_issue_id IS NULL))
);
INSERT INTO stock_transactions(tenant_id,item_id,location_id,type,quantity_delta,reason) SELECT i.tenant_id,i.id,l.id,'OPENING',i.quantity,'Preserved legacy opening stock' FROM inventory_items i JOIN inventory_locations l ON l.tenant_id=i.tenant_id AND l.name='Legacy store' WHERE i.quantity>0;
CREATE INDEX stock_balance_scope ON stock_transactions(tenant_id,item_id,location_id);
CREATE FUNCTION prevent_stock_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Stock history is immutable; post a correction movement'; END $$;
CREATE TRIGGER stock_history_immutable BEFORE UPDATE OR DELETE ON stock_transactions FOR EACH ROW EXECUTE FUNCTION prevent_stock_history_change();
INSERT INTO permissions(key,name,description,module) VALUES('inventory.view','View inventory','View stock and movements','inventory'),('inventory.manage','Manage inventory','Manage item masters','inventory'),('inventory.transact','Transact stock','Receive issue return and adjust stock','inventory') ON CONFLICT(key) DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key LIKE 'inventory.%' ON CONFLICT DO NOTHING;
