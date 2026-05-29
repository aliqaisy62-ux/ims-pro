import { Request, Response, NextFunction } from 'express'

// ── Permission constants ──────────────────────────────────────────────────────

export const Permission = {
  // Customers
  CUSTOMERS_VIEW:       'customers:view',
  CUSTOMERS_EDIT:       'customers:edit',
  // Inventory / Items
  INVENTORY_VIEW:       'inventory:view',
  INVENTORY_EDIT:       'inventory:edit',
  // Sales
  SALES_VIEW:           'sales:view',
  SALES_CREATE:         'sales:create',
  SALES_MANAGE:         'sales:manage',       // cancel, return, admin ops
  // Purchases
  PURCHASES_VIEW:       'purchases:view',
  PURCHASES_CREATE:     'purchases:create',
  PURCHASES_MANAGE:     'purchases:manage',   // cancel, confirm
  // Stock transfers
  STOCK_VIEW:           'stock:view',
  STOCK_TRANSFER:       'stock:transfer',     // create IN/OUT transfers
  // Expenses
  EXPENSES_VIEW:        'expenses:view',
  EXPENSES_CREATE:      'expenses:create',
  // Payment vouchers
  VOUCHERS_VIEW:        'vouchers:view',
  VOUCHERS_CREATE:      'vouchers:create',
  // Suppliers
  SUPPLIERS_VIEW:       'suppliers:view',
  SUPPLIERS_EDIT:       'suppliers:edit',
  // Reports
  REPORTS_VIEW:         'reports:view',
  REPORTS_FINANCIAL:    'reports:financial',  // profit report — restricted to ADMIN/MANAGER/ACCOUNTANT
  // Cash statement
  CASH_STATEMENT_VIEW:  'cash-statement:view',
  CASH_STATEMENT_CLOSE: 'cash-statement:close',
  // Settings & system
  SETTINGS_VIEW:        'settings:view',
  SETTINGS_EDIT:        'settings:edit',
  // User management
  USERS_VIEW:           'users:view',
  USERS_MANAGE:         'users:manage',
  // Audit logs
  AUDIT_VIEW:           'audit:view',
} as const

export type PermissionKey = typeof Permission[keyof typeof Permission]

const ALL: PermissionKey[] = Object.values(Permission)

// ── Role → permission matrix (least privilege) ───────────────────────────────

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  ADMIN: ALL,

  MANAGER: [
    Permission.CUSTOMERS_VIEW,       Permission.CUSTOMERS_EDIT,
    Permission.INVENTORY_VIEW,       Permission.INVENTORY_EDIT,
    Permission.SALES_VIEW,           Permission.SALES_CREATE,    Permission.SALES_MANAGE,
    Permission.PURCHASES_VIEW,       Permission.PURCHASES_CREATE, Permission.PURCHASES_MANAGE,
    Permission.STOCK_VIEW,           Permission.STOCK_TRANSFER,
    Permission.EXPENSES_VIEW,        Permission.EXPENSES_CREATE,
    Permission.VOUCHERS_VIEW,        Permission.VOUCHERS_CREATE,
    Permission.SUPPLIERS_VIEW,       Permission.SUPPLIERS_EDIT,
    Permission.REPORTS_VIEW,         Permission.REPORTS_FINANCIAL,
    Permission.CASH_STATEMENT_VIEW,  Permission.CASH_STATEMENT_CLOSE,
    Permission.SETTINGS_VIEW,
    Permission.USERS_VIEW,
    Permission.AUDIT_VIEW,
  ],

  ACCOUNTANT: [
    Permission.CUSTOMERS_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.SALES_VIEW,
    Permission.PURCHASES_VIEW,
    Permission.STOCK_VIEW,
    Permission.EXPENSES_VIEW,        Permission.EXPENSES_CREATE,
    Permission.VOUCHERS_VIEW,        Permission.VOUCHERS_CREATE,
    Permission.SUPPLIERS_VIEW,
    Permission.REPORTS_VIEW,         Permission.REPORTS_FINANCIAL,
    Permission.CASH_STATEMENT_VIEW,  Permission.CASH_STATEMENT_CLOSE,
    Permission.SETTINGS_VIEW,
    Permission.AUDIT_VIEW,
  ],

  CASHIER: [
    Permission.CUSTOMERS_VIEW,       Permission.CUSTOMERS_EDIT,
    Permission.INVENTORY_VIEW,
    Permission.SALES_VIEW,           Permission.SALES_CREATE,
    Permission.STOCK_VIEW,
  ],

  STAFF: [
    Permission.CUSTOMERS_VIEW,       Permission.CUSTOMERS_EDIT,
    Permission.INVENTORY_VIEW,
    Permission.SALES_VIEW,           Permission.SALES_CREATE,
    Permission.PURCHASES_VIEW,
    Permission.STOCK_VIEW,
  ],

  VIEWER: [
    Permission.CUSTOMERS_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.SALES_VIEW,
    Permission.PURCHASES_VIEW,
    Permission.EXPENSES_VIEW,
    Permission.VOUCHERS_VIEW,
    Permission.SUPPLIERS_VIEW,
    Permission.STOCK_VIEW,
    Permission.REPORTS_VIEW,
    Permission.CASH_STATEMENT_VIEW,
  ],
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function hasPermission(role: string, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Require at least one of the supplied permissions.
export function requirePermission(...permissions: PermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    const allowed = permissions.some(p => hasPermission(req.user!.role, p))
    if (!allowed) {
      return res.status(403).json({
        success:  false,
        error:    'Insufficient permissions',
        required: permissions,
      })
    }
    next()
  }
}
