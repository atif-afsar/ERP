import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/academics/classes
router.get('/classes', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  const classesRes = await query(
    'SELECT * FROM classes WHERE tenant_id = $1 ORDER BY numeric_level ASC, name ASC',
    [tenantId]
  );

  const sectionsRes = await query(
    'SELECT * FROM sections WHERE tenant_id = $1 ORDER BY name ASC',
    [tenantId]
  );

  const sectionsByClass = new Map<string, any[]>();
  for (const s of sectionsRes.rows) {
    if (!sectionsByClass.has(s.class_id)) {
      sectionsByClass.set(s.class_id, []);
    }
    sectionsByClass.get(s.class_id)!.push({
      id: s.id,
      name: s.name,
      capacity: s.capacity || 40,
      classTeacherId: s.class_teacher_id,
    });
  }

  const mapped = classesRes.rows.map((c) => ({
    id: c.id,
    tenantId: c.tenant_id,
    name: c.name,
    numericGrade: c.numeric_level || 1,
    stream: c.stream || 'General',
    sections: sectionsByClass.get(c.id) || [],
  }));

  res.json({
    data: mapped,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/academics/classes
router.post('/classes', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id, name, numericGrade = 1, stream = 'General', sections = [] } = req.body;

  if (!name) {
    throw new AppError('Class name is required.', 422, 'VALIDATION_ERROR');
  }

  const savedClass = await transaction(async (client) => {
    let classId = id;
    if (classId) {
      const updateRes = await client.query(
        `INSERT INTO classes (id, tenant_id, name, numeric_level, stream)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           numeric_level = EXCLUDED.numeric_level,
           stream = EXCLUDED.stream,
           updated_at = NOW()
         WHERE classes.tenant_id = EXCLUDED.tenant_id
         RETURNING *`,
        [classId, tenantId, name, numericGrade, stream]
      );
      if (!updateRes.rows.length) throw new AppError('Class belongs to another institution.', 403, 'FORBIDDEN');
      classId = updateRes.rows[0].id;
    } else {
      const insertRes = await client.query(
        `INSERT INTO classes (tenant_id, name, numeric_level, stream)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenantId, name, numericGrade, stream]
      );
      classId = insertRes.rows[0].id;
    }

    // Upsert sections
    const savedSections: any[] = [];
    for (const sec of sections) {
      if (sec.id) {
        const sRes = await client.query(
          `INSERT INTO sections (id, tenant_id, class_id, name, capacity)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             capacity = EXCLUDED.capacity,
             updated_at = NOW()
           WHERE sections.tenant_id = EXCLUDED.tenant_id AND sections.class_id = EXCLUDED.class_id
           RETURNING *`,
          [sec.id, tenantId, classId, sec.name, sec.capacity || 40]
        );
        if (!sRes.rows.length) throw new AppError('Section belongs to another class or institution.', 403, 'FORBIDDEN');
        savedSections.push(sRes.rows[0]);
      } else {
        const sRes = await client.query(
          `INSERT INTO sections (tenant_id, class_id, name, capacity)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [tenantId, classId, sec.name, sec.capacity || 40]
        );
        savedSections.push(sRes.rows[0]);
      }
    }

    return {
      id: classId,
      tenantId,
      name,
      numericGrade,
      stream,
      sections: savedSections.map((s) => ({
        id: s.id,
        name: s.name,
        capacity: s.capacity,
      })),
    };
  });

  res.status(201).json({
    data: savedClass,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// DELETE /api/v1/academics/classes/:id
router.delete('/classes/:id', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    'DELETE FROM classes WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [req.params.id, req.tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Class not found.', 404, 'NOT_FOUND');
  }

  res.json({
    data: { success: true, id: req.params.id },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// GET /api/v1/academics/subjects
router.get('/subjects', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM subjects WHERE tenant_id = $1 ORDER BY name ASC',
    [req.tenantId]
  );

  res.json({
    data: result.rows,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
