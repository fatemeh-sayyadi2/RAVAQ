# Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: No document in Firestore is readable or writable unless explicitly matched and authorized.
2. **PII Split Isolation**: User PII (`email`, `mobile`) is stored strictly inside `/users/{userId}/private/{docId}` and `/users/{userId}/addresses/{addressId}`, accessible only to `isOwner(userId)` or `isAdmin()`.
3. **Self-Assigned Role Prevention**: Users creating `/users/{userId}` can only set `role == 'CUSTOMER'` unless `isAdmin()` is true. During updates, `role`, `uid`, and `createdAt` are strictly immutable for non-admins.
4. **Master Gate Sync**: Subcollections `/users/{userId}/private/{docId}` and `/users/{userId}/addresses/{addressId}` require the parent `/users/{userId}` document to exist and belong to `request.auth.uid`.
5. **Terminal State Locking on Orders**: Once an `/orders/{orderId}` document reaches terminal status `'DELIVERED'` or `'CANCELLED'`, non-admin updates are strictly rejected.
6. **Strict Timestamp & Key Enforcement**: Every `create` validates `createdAt == request.time`, `hasAll`, and `hasOnly`. Every `update` validates `updatedAt == request.time`, `isValid[Entity](incoming())`, and `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection**: Creating `/users/u1` with `{ uid: 'u1', displayName: 'Ali', role: 'CUSTOMER', isSuperAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> `PERMISSION_DENIED`.
2. **Privilege Escalation on Create**: Non-admin creating `/users/u1` with `role: 'ADMIN'` -> `PERMISSION_DENIED`.
3. **Privilege Escalation on Update**: Non-admin updating `/users/u1` field `role` to `'ADMIN'` -> `PERMISSION_DENIED`.
4. **Unverified Email Spoof**: Request with `request.auth.token.email == 'fawti.tiri2@gmail.com'` and `email_verified == false` attempting admin write -> `PERMISSION_DENIED`.
5. **Cross-User PII Read**: Authenticated user `u2` attempting `get(/users/u1/private/info)` -> `PERMISSION_DENIED`.
6. **Orphaned Subcollection Write**: Authenticated user `u1` creating `/users/u1/addresses/a1` when `/users/u1` does not exist -> `PERMISSION_DENIED`.
7. **ID Poisoning Attack**: Creating document with 256-character or special-character ID -> `PERMISSION_DENIED`.
8. **Value Poisoning on Update**: Updating `/users/u1` `displayName` with a 5,000-character string -> `PERMISSION_DENIED`.
9. **Immortal Field Mutation**: Updating `createdAt` or `uid` on `/users/u1` -> `PERMISSION_DENIED`.
10. **Client Timestamp Forgery**: Creating `/reviews/r1` with a past/future client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
11. **Terminal Order Mutation**: Non-admin updating `/orders/o1` when `existing().status == 'DELIVERED'` -> `PERMISSION_DENIED`.
12. **Unfiltered Order List Scraping**: Authenticated user running `list` on `/orders` without `where('userId', '==', request.auth.uid)` -> `PERMISSION_DENIED`.

## 3. Red Team Audit Matrix

- `/users/{userId}`: Protected against Identity Spoofing, Shadow Updates, Value Poisoning, and Role Escalation.
- `/users/{userId}/private/{docId}`: PII-isolated, Master-Gated to parent `/users/{userId}`.
- `/users/{userId}/addresses/{addressId}`: PII-isolated, regex-validated Iranian mobile & 10-digit postal code, Master-Gated.
- `/orders/{orderId}`: Query-enforced `allow list`, terminal state locked, immutable `userId` and `orderNumber`.
- `/reviews/{reviewId}`: Verified user authorship (`userId == request.auth.uid`), bounded rating `1..5` and comment length `<= 600`.
