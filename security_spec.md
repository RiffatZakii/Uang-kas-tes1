# Security Specification: Uang Kas 9D Firestore Security Rules

## 1. Data Invariants

1. **Identity & Authorization Gate**: Only authenticated and verified users with administrator or treasurer privileges can record payments or modify student balance records.
2. **Bootstrapped Admin Invariant**: The initial bootstrap administrator is identified by email `riffatzaki201@gmail.com` (with `email_verified == true`) or an explicit record in the `/admins/{adminId}` collection.
3. **Student Roster Integrity**:
   - `id` must be an integer between 1 and 24.
   - `name` must be a string with length between 2 and 100 characters.
   - `amount` must be a non-negative integer (>= 0 and <= 100,000,000).
   - `week` must equal `amount / 10000` (integer division milestone).
   - `updatedAt` must be strictly bound to `request.time`.
   - `updatedBy` must match `request.auth.uid`.
4. **Financial Ledger Immutability**:
   - Payments are append-only audit records. No updates or deletions are permitted once recorded (`allow update, delete: if false`).
   - `amount` must be strictly greater than 0.
   - `changeType` must be either `'ADD'` or `'DECREASE'`.
   - `createdAt` must strictly equal `request.time`.
   - `createdBy` must strictly match `request.auth.uid`.
5. **No Shadow Fields / Injection Prevention**:
   - Document ID parameters must conform to regex `^[a-zA-Z0-9_\\-]+$` and size <= 128.
   - Payloads must contain only explicitly allowed keys with exact count checks on creation.

---

## 2. The "Dirty Dozen" Payloads

Below are 12 malicious payloads designed to test and violate Identity, Integrity, and State boundaries. All must be rejected (`PERMISSION_DENIED`).

1. **Payload 1 (Unauthenticated Write)**:
   - Target: `/students/1`
   - Data: `{"id": 1, "name": "Siswa 01", "amount": 50000, "week": 5, "updatedAt": "request.time", "updatedBy": "anon"}`
   - Expected: `PERMISSION_DENIED` (auth == null).

2. **Payload 2 (Unverified Email Admin Spoof)**:
   - Target: `/students/1`
   - Context: Token email is `riffatzaki201@gmail.com`, but `email_verified == false`.
   - Expected: `PERMISSION_DENIED` (email_verified must be true).

3. **Payload 3 (Negative Cash Balance Poisoning)**:
   - Target: `/students/1`
   - Data: `{"id": 1, "name": "Siswa 01", "amount": -20000, "week": 0, "updatedAt": "request.time", "updatedBy": "auth_uid"}`
   - Expected: `PERMISSION_DENIED` (`amount >= 0` check fails).

4. **Payload 4 (Out-of-Sync Milestone Injection)**:
   - Target: `/students/1`
   - Data: `{"id": 1, "name": "Siswa 01", "amount": 10000, "week": 99, "updatedAt": "request.time", "updatedBy": "auth_uid"}`
   - Expected: `PERMISSION_DENIED` (`week == amount / 10000` check fails).

5. **Payload 5 (Shadow Field Injection in Student)**:
   - Target: `/students/1`
   - Data: `{"id": 1, "name": "Siswa 01", "amount": 10000, "week": 1, "updatedAt": "request.time", "updatedBy": "auth_uid", "isVIP": true}`
   - Expected: `PERMISSION_DENIED` (Exact key count violation).

6. **Payload 6 (Client Timestamp Forgery)**:
   - Target: `/students/1`
   - Data: `{"id": 1, "name": "Siswa 01", "amount": 10000, "week": 1, "updatedAt": "2020-01-01T00:00:00Z", "updatedBy": "auth_uid"}`
   - Expected: `PERMISSION_DENIED` (`updatedAt == request.time` constraint fails).

7. **Payload 7 (Identity Spoofing in Audit Trail)**:
   - Target: `/payments/pay_01`
   - Data: `{"studentId": 1, "studentName": "Siswa 01", "amount": 10000, "changeType": "ADD", "createdAt": "request.time", "createdBy": "victim_uid"}`
   - Expected: `PERMISSION_DENIED` (`createdBy == request.auth.uid` fails).

8. **Payload 8 (Ledger Tampering / Update Attempt)**:
   - Target: `/payments/pay_01`
   - Action: `update`
   - Data: `{"amount": 0}`
   - Expected: `PERMISSION_DENIED` (Payments are append-only; update is forbidden).

9. **Payload 9 (Zero / Negative Payment Nominal)**:
   - Target: `/payments/pay_02`
   - Data: `{"studentId": 1, "studentName": "Siswa 01", "amount": 0, "changeType": "ADD", "createdAt": "request.time", "createdBy": "auth_uid"}`
   - Expected: `PERMISSION_DENIED` (`amount > 0` constraint fails).

10. **Payload 10 (Invalid ChangeType Value)**:
    - Target: `/payments/pay_03`
    - Data: `{"studentId": 1, "studentName": "Siswa 01", "amount": 10000, "changeType": "STEAL", "createdAt": "request.time", "createdBy": "auth_uid"}`
    - Expected: `PERMISSION_DENIED` (`changeType in ['ADD', 'DECREASE']` fails).

11. **Payload 11 (Path Traversal / Malicious ID Injection)**:
    - Target: `/students/../../malicious`
    - Action: `get` / `create`
    - Expected: `PERMISSION_DENIED` (`isValidId` regex matches only `^[a-zA-Z0-9_\-]+$`).

12. **Payload 12 (Self-Escalation to Admin Role)**:
    - Target: `/admins/non_admin_uid`
    - Action: `create`
    - Data: `{"email": "attacker@evil.com", "role": "admin", "createdAt": "request.time"}`
    - Expected: `PERMISSION_DENIED` (Non-admin cannot grant admin privileges).
