import { TenantConfig } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { storage } from '../services/storageService';

/**
 * Tenant Repository
 * Implements hybrid persistence: live Supabase PostgreSQL with resilient local fallback.
 */
class TenantRepository {
  async getAll(): Promise<ServiceResult<TenantConfig[]>> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('tenants').select('*');
        if (!error && data && data.length > 0) {
          const mapped: TenantConfig[] = data.map((t: any) => {
            const isCoaching = t.tenant_type === 'coaching';
            return {
              id: t.id,
              name: t.name,
              code: t.slug ? t.slug.toUpperCase() : t.name.slice(0, 4).toUpperCase(),
              tenantType: isCoaching ? 'COACHING' : 'SCHOOL',
              status: t.status === 'active' ? 'active' : 'trial',
              logo: t.logo_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&q=80',
              primaryColor: '#059669',
              secondaryColor: '#0f172a',
              accentColor: '#10b981',
              address: [t.address_line_1, t.city, t.state].filter(Boolean).join(', ') || 'Campus Grounds, New Delhi',
              phone: t.phone || '+91 98765 43210',
              email: t.email || 'info@edunexus.in',
              currency: t.currency || 'INR',
              currencySymbol: '₹',
              timezone: t.timezone || 'Asia/Kolkata',
              academicYear: '2026-2027',
              planName: 'Enterprise SaaS',
              subscriptionRenewalDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
              labels: {
                group: isCoaching ? 'Batch' : 'Class',
                subgroup: isCoaching ? 'Track' : 'Section',
                groupPlural: isCoaching ? 'Batches' : 'Classes',
                student: isCoaching ? 'Learner' : 'Student',
                studentPlural: isCoaching ? 'Learners' : 'Students',
                staff: isCoaching ? 'Lead Faculty' : 'Teacher',
                staffPlural: isCoaching ? 'Faculty' : 'Teachers',
                admission: isCoaching ? 'Enrollment' : 'Admission',
                period: isCoaching ? 'Batch Term' : 'Academic Year',
                exam: isCoaching ? 'Test Series' : 'Examination',
                examPlural: isCoaching ? 'Mock Tests' : 'Examinations',
                reportCard: isCoaching ? 'Performance Ledger' : 'Report Card',
                homework: isCoaching ? 'DPP / Problem Set' : 'Homework',
                feeStructure: isCoaching ? 'Course Fee Plan' : 'Annual Fee Structure',
              },
              features: {
                attendance: true,
                qrAttendance: true,
                fees: true,
                onlinePayments: true,
                exams: true,
                reportCards: true,
                testSeries: isCoaching,
                rankComparison: isCoaching,
                homework: true,
                timetable: true,
                communication: true,
                whatsappAlerts: true,
                inquiryCrm: true,
                certificates: true,
                hrPayroll: true,
                aiAssistant: true,
                aiReportSummary: true,
                transport: true,
                library: true,
                hostel: true,
                mess: true,
                inventory: true,
                health: true,
                alumni: true,
                visitorGate: true,
                biometric: false,
              },
            };
          });
          return ok(mapped);
        }
      } catch (err) {
        console.warn('[TenantRepository] Live Supabase query failed, falling back to local store:', err);
      }
    }

    // Resilient offline fallback
    const localTenants = storage.getTenants();
    return ok(localTenants, true);
  }

  async getById(id: string): Promise<ServiceResult<TenantConfig>> {
    const all = await this.getAll();
    if (all.error) return all;
    const found = all.data.find((t) => t.id === id);
    if (!found) {
      return fail('NOT_FOUND', 'Tenant not found: ' + id, null, 404);
    }
    return ok(found, all.isOffline);
  }

  async save(tenant: TenantConfig): Promise<ServiceResult<TenantConfig>> {
    if (isSupabaseConfigured()) {
      try {
        const payload = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.code.toLowerCase(),
          tenant_type: tenant.tenantType === 'COACHING' ? 'coaching' : 'school',
          status: tenant.status,
          logo_url: tenant.logo,
          phone: tenant.phone,
          email: tenant.email,
          currency: tenant.currency,
          timezone: tenant.timezone,
        };
        const { error } = await supabase.from('tenants').upsert(payload);
        if (error) {
          console.warn('[TenantRepository] Live upsert failed:', error.message);
        }
      } catch (err) {
        console.warn('[TenantRepository] Error during live save, continuing with local cache:', err);
      }
    }

    // Always keep storageService in sync for instant responsiveness
    const all = storage.getTenants();
    const idx = all.findIndex((t) => t.id === tenant.id);
    if (idx >= 0) all[idx] = tenant;
    else all.push(tenant);
    storage.saveTenants(all);

    return ok(tenant);
  }
}

export const tenantRepository = new TenantRepository();
