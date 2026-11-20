# Stack House Security Specification (Phase 0)

## 1. Data Invariants
1. **User Identity & Privilege Escalation Prevention**:
   - A client creating `/users/{userId}` MUST have `request.auth.uid == userId`, verified email (`request.auth.token.email_verified == true`), and MUST set `role == 'client'` unless the caller is already an admin.
   - A client updating `/users/{userId}` MUST NOT modify `uid`, `role`, or `createdAt`.
   - Private PII (`/users/{userId}/private/info`) is readable and writable ONLY by the owning user (`request.auth.uid == userId`) or an admin (`isAdmin()`).
2. **Menu Catalog Integrity**:
   - `/menuItems/{itemId}` is publicly readable (`get`, `list`) so visitors can browse the storefront.
   - Only verified admins (`isAdmin()`) may create, update, or delete `/menuItems/{itemId}`.
3. **Order Lifecycle & Ownership**:
   - Creating `/orders/{orderId}` requires `isSignedIn() && email_verified`, `incoming().customerUid == request.auth.uid`, initial `stage == 'received'`, positive numeric totals (`total >= 0`), bounded `itemSummaries` list (`1..30` items), and server-enforced timestamps (`createdAt == request.time`, `updatedAt == request.time`).
   - Reading/listing `/orders/{orderId}` is restricted strictly to `resource.data.customerUid == request.auth.uid || isAdmin()`.
   - Updating `/orders/{orderId}` stage is restricted to admins (`isAdmin()`), and once an order reaches terminal stage `'ready'`, non-admin mutations are blocked and stage transitions cannot alter `customerUid`, `total`, or `createdAt`.
4. **Admin Allowlist**:
   - `/admins/{adminUid}` is readable by the matching user or existing admins, and writable only by existing admins (bootstrapped admin email: `leu.lay@fellow.passerellesnumeriques.org` with `email_verified == true`).

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Admin Escalation**: Client creates `/users/attackerUid` with `{ role: "admin" }`.
2. **Role Mutation on Update**: Existing client updates `/users/clientUid` changing `{ role: "admin" }`.
3. **PII Cross-User Read**: Authenticated client A reads `/users/clientB/private/info`.
4. **Shadow Field Injection on User**: Client creates `/users/clientUid` with extra key `{ isVip: true }`.
5. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create `/orders/SH-9999`.
6. **Spoofed Order Owner**: Client A creates `/orders/SH-1001` with `{ customerUid: "clientB" }`.
7. **Forged Initial Order Stage**: Client creates `/orders/SH-1002` with `{ stage: "ready" }` to bypass kitchen queue.
8. **Backdated Order Timestamp**: Client creates `/orders/SH-1003` with client-supplied `createdAt` not matching `request.time`.
9. **Cross-User Order List Scrape**: Client A calls `list` on `/orders` without `where('customerUid', '==', clientA.uid)`.
10. **Client Menu Tampering**: Non-admin client attempts to update `/menuItems/classic-double-smash` setting `{ basePrice: 0.01 }`.
11. **Oversized Document ID Poisoning**: Client writes `/orders/<200-char-string>` or invalid characters `../bad`.
12. **Terminal State Tampering**: Client attempts to update `/orders/SH-1001` after creation to alter `total` or `stage`.
