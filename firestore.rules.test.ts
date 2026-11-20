/**
 * Verification checklist & payload test vectors for Stack House Firestore rules.
 * Mirrors the 12 Dirty Dozen attack payloads documented in security_spec.md.
 */

export interface SecurityTestCase {
  name: string;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update';
  expected: 'PERMISSION_DENIED' | 'ALLOWED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    name: '1. Self-Admin Escalation on Create',
    path: '/users/attacker-1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'attacker-1', displayName: 'Evil', role: 'admin', registrationCompleted: true },
  },
  {
    name: '2. Role Mutation on Update',
    path: '/users/client-1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { role: 'admin' },
  },
  {
    name: '3. Cross-User PII Read',
    path: '/users/client-2/private/info',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Shadow Field Injection on User',
    path: '/users/client-1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'client-1', displayName: 'Alex', role: 'client', registrationCompleted: true, isVip: true },
  },
  {
    name: '5. Unverified Email Order Create',
    path: '/orders/SH-9999',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Spoofed Order Owner',
    path: '/orders/SH-1001',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { customerUid: 'other-user' },
  },
  {
    name: '7. Forged Initial Order Stage',
    path: '/orders/SH-1002',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { stage: 'ready' },
  },
  {
    name: '8. Backdated Order Timestamp',
    path: '/orders/SH-1003',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
  },
  {
    name: '9. Unfiltered Order List Scrape by Non-Admin',
    path: '/orders',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Client Menu Price Tampering',
    path: '/menuItems/classic-double-smash',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { basePrice: 0.01 },
  },
  {
    name: '11. Oversized Document ID Poisoning',
    path: `/orders/${'a'.repeat(200)}`,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Terminal State Order Mutation',
    path: '/orders/SH-1001',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { total: 0 },
  },
];
