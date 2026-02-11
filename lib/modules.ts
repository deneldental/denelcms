export const MODULES = {
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  MEDICAL_RECORDS: 'medical_records',
  INVENTORY: 'inventory',
  PRODUCTS: 'products',
  PAYMENTS: 'payments',
  EXPENSES: 'expenses',
  MESSAGING: 'messaging',
  USERS: 'users',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs',
  ORTHO_CONSENT: 'ortho_consent',
} as const

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const

export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
} as const
