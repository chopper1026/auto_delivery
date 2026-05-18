# Auto Delivery V1 Design

## Goal

Build a card-key based automatic delivery website. Public users do not log in. They enter a card key, redeem it once, and receive either text content or a one-time downloadable ZIP package. Administrators manage goods, card keys, inventory, and audit logs from a password-protected backend.

## Confirmed Decisions

- Frontend and backend use Next.js, React, and TypeScript.
- UI uses Tailwind CSS and shadcn/ui.
- Database uses PostgreSQL with Prisma.
- Initial file storage uses local server disk mounted through Docker volumes.
- File ZIP packages are generated and saved when redemption succeeds.
- Full card keys are shown/exported only once at generation time. The database stores only key hashes and masked key strings.
- File inventory is reserved when a file-type card key is generated. Deleting an unredeemed card key releases the reserved inventory.
- The initial administrator account is created from environment variables when no admin exists.
- V1 supports one administrator account and no public user accounts.
- V1 restricts uploaded inventory files to `.json` files because the initial file-goods use case is JSON delivery.
- V1 supports generating one card key at a time. Batch generation is deferred.
- Generated ZIP files are retained indefinitely in V1 unless deleted manually at the server level. Automated cleanup is deferred.
- Card keys use a grouped uppercase format with an `AD` prefix.

## Product Scope

### Public User

The public homepage contains one primary action: enter a card key and redeem it.

On submission, the system validates that:

- The card key exists.
- The card key is not deleted.
- The card key has not expired.
- The card key has not already been redeemed.
- The linked goods item exists and is enabled.
- For file goods, the reserved file inventory for the card key is available.

If validation passes, the card key is marked redeemed and the user is redirected to a receipt page through an unguessable receipt token.

For text goods, the receipt page displays the configured text content directly.

For file goods, the receipt page displays a download button. The ZIP package is generated during redemption and can be downloaded only once. V1 does not expose a second recovery download after the first successful response starts.

### Admin Backend

The admin backend contains four modules:

- Overview
- Goods Management
- Card Key Management
- Logs

The backend requires password login before access. V1 uses a single administrator account created from `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

## Technical Architecture

The app is a Next.js application using the App Router.

- Public pages render the card-key redemption form and receipt page.
- Admin pages render authenticated management screens.
- Server actions or route handlers handle redemption, upload, card generation, login, logout, and downloads.
- Prisma owns database access and migrations.
- PostgreSQL stores durable state and audit history.
- Uploaded source files, generated ZIP packages, and temporary processing files are stored under a Docker-mounted volume.

The deployment target is Docker Compose with at least:

- `app`: Next.js application
- `postgres`: PostgreSQL database
- `app-data`: persistent file volume
- `postgres-data`: persistent database volume

## Data Model

### AdminUser

Stores administrator authentication data.

Fields:

- `id`
- `username`
- `passwordHash`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

### Goods

Stores goods definitions.

Fields:

- `id`
- `name`
- `type`: `TEXT` or `FILE`
- `textContent`: nullable, used only for text goods
- `status`: `ACTIVE` or `DISABLED`
- `createdAt`
- `updatedAt`

### GoodsFile

Stores individual file inventory items.

Fields:

- `id`
- `goodsId`
- `originalName`
- `storedName`
- `storagePath`
- `sizeBytes`
- `mimeType`
- `sha256`
- `status`: `AVAILABLE`, `RESERVED`, `REDEEMED`, or `DELETED`
- `reservedByCardKeyId`: nullable
- `redeemedByRedemptionId`: nullable
- `createdAt`
- `reservedAt`
- `redeemedAt`

### CardKey

Stores generated card keys without plaintext secrets.

Fields:

- `id`
- `keyHash`
- `keyMask`
- `goodsId`
- `goodsType`
- `fileQuantity`
- `expiresAt`: nullable for never expires
- `status`: `ACTIVE`, `REDEEMED`, `EXPIRED`, or `DELETED`
- `createdAt`
- `redeemedAt`
- `deletedAt`

For text goods, `fileQuantity` is `0`.

For file goods, `fileQuantity` is greater than `0`, and matching `GoodsFile` rows are reserved when the card key is generated.

### Redemption

Stores redemption events.

Fields:

- `id`
- `cardKeyId`
- `goodsId`
- `receiptTokenHash`
- `receiptTokenMask`
- `ipAddress`
- `userAgent`
- `redeemedAt`
- `zipPath`: nullable, used for file goods
- `zipSizeBytes`: nullable
- `downloadCount`
- `firstDownloadedAt`

The plaintext receipt token is only sent to the user's browser in the receipt URL. The database stores a hash.

### RedemptionFile

Maps a redemption to the files included in its ZIP package.

Fields:

- `id`
- `redemptionId`
- `goodsFileId`
- `originalName`
- `createdAt`

### DownloadLog

Stores download attempts and results.

Fields:

- `id`
- `redemptionId`
- `ipAddress`
- `userAgent`
- `result`: `SUCCESS`, `ALREADY_DOWNLOADED`, `NOT_FOUND`, or `ERROR`
- `createdAt`

### AdminAuditLog

Stores administrator actions.

Fields:

- `id`
- `adminUserId`
- `action`
- `entityType`
- `entityId`
- `ipAddress`
- `userAgent`
- `metadataJson`
- `createdAt`

## Redemption Rules

### Text Goods

1. User submits a card key.
2. System hashes the submitted key and finds a matching active card key.
3. System validates expiration and redemption status.
4. In a database transaction, the system creates a `Redemption`, marks the card key redeemed, and records redemption metadata.
5. User is redirected to the receipt page.
6. Receipt page displays the text content.

### File Goods

File goods use reservation at card-key generation time.

Card generation:

1. Admin selects file goods and quantity.
2. System checks that enough `AVAILABLE` files exist.
3. In a database transaction, the system creates the card key and marks selected files as `RESERVED` for that card key.
4. Full plaintext card key is displayed/exported once.

Redemption:

1. User submits a card key.
2. System validates the card key and associated reserved files.
3. In a database transaction, the system creates a `Redemption`, links reserved files through `RedemptionFile`, marks files `REDEEMED`, and marks the card key `REDEEMED`.
4. System generates a ZIP package from the redeemed files and stores it on disk.
5. User is redirected to the receipt page.
6. Receipt page displays a download button.

Download:

1. User clicks download.
2. System validates the receipt token.
3. System atomically allows download only when `downloadCount = 0`.
4. On success, system increments `downloadCount`, sets `firstDownloadedAt`, writes `DownloadLog`, and streams the ZIP.
5. Later attempts are denied and logged.

ZIP generation must complete before the redemption response is considered successful. If ZIP generation fails, the system rolls back database changes when possible, removes partial ZIP files, logs the error, and returns a generic redemption failure to the user.

## Inventory Rules

- Uploaded files start as `AVAILABLE`.
- Generating a file-type card key reserves files immediately.
- Reserved files are not available to other card keys.
- Redeeming a card key changes reserved files to `REDEEMED`.
- Deleting an unredeemed card key releases its reserved files back to `AVAILABLE`.
- Deleting a redeemed card key is not allowed in V1; it can only be hidden or marked archived in a future version.
- Deleted goods do not physically remove files in V1. Goods can be disabled to prevent new card generation.
- Reserved files for expired but unredeemed card keys remain reserved until an administrator deletes the card key. Automatic release of expired card-key inventory is deferred to avoid surprising inventory changes.

## Security Design

### Public Card Key Safety

- Card keys are generated using cryptographically secure random bytes.
- The database stores a hash of the key, not the plaintext key.
- Admin screens show only masked keys after generation.
- Redemption endpoint uses rate limiting to reduce brute-force attempts.
- Public error messages are generic and do not reveal whether a specific key exists.

### Admin Authentication

- Passwords are hashed with a strong password hashing algorithm.
- Admin session cookies are `HttpOnly`, `Secure` in production, and `SameSite=Lax` or stricter.
- Admin login is rate limited by IP and username.
- Admin write operations use CSRF protection.
- Admin actions are written to `AdminAuditLog`.

### File Upload and Download Safety

- Uploaded files are stored outside the public static directory.
- Stored filenames are random and never derived directly from uploaded filenames.
- Original filenames are preserved only as metadata and sanitized when used in ZIP entries.
- Downloads are served only through authenticated receipt-token route handlers.
- Direct file paths are never exposed to users.
- V1 accepts only `.json` uploaded inventory files for file goods, while keeping the model flexible for future file types.

## Admin UX

### Overview

Shows:

- Total card keys
- Active card keys
- Redeemed card keys
- Expired card keys
- Today's redemptions
- Today's downloads
- File inventory by goods
- Recent redemption and download errors

### Goods Management

Supports:

- Create text goods with name and content.
- Create file goods with name.
- Upload multiple files to a file goods item.
- Display uploaded count, available count, reserved count, and redeemed count.
- Disable goods to prevent new card generation.

For file upload, the UI shows the detected number of selected files before upload and final accepted count after upload.

### Card Key Management

Supports:

- Generate a single card key.
- Select linked goods.
- For file goods, select file quantity.
- Select expiration: 1 day, 3 days, 7 days, or never expires.
- Default expiration is 3 days.
- Display/export plaintext key once after generation.
- List existing card keys by masked key, goods, status, expiration, and created time.
- Delete unredeemed card keys and release reserved files.

Batch card generation is out of scope for V1.

### Logs

Supports:

- View redemption logs.
- View download logs.
- View admin operation logs.
- Filter by time, goods, card key mask, result, and IP.

## Error Handling

Public redemption errors should be generic:

- Invalid or unavailable card key.
- Card key has expired.
- Card key has already been redeemed.
- Goods unavailable.
- Redemption temporarily failed.

Admin screens should show actionable errors:

- Not enough available file inventory.
- File upload failed.
- ZIP generation failed.
- Cannot delete redeemed card key.
- Login failed or rate limited.

## Testing Strategy

Unit tests:

- Card key generation, hashing, masking, and expiration calculation.
- Inventory reservation and release.
- Download count enforcement.
- Filename sanitization.

Integration tests:

- Text goods redemption flow.
- File goods card generation with reservation.
- File goods redemption and ZIP creation.
- One-time download enforcement.
- Expired card key rejection.
- Duplicate redemption prevention.
- Delete unredeemed file card releases inventory.

Manual verification:

- Upload 100 JSON files and verify inventory counts.
- Generate a file card key for quantity 10.
- Redeem the key and verify 10 files are included in the ZIP.
- Verify those 10 files cannot be reused.
- Verify second download is rejected and logged.

## Out of Scope for V1

- Public user accounts.
- Online payment integration.
- Multi-admin roles and permissions.
- Batch card-key generation.
- Cloud object storage.
- Automated ZIP cleanup policy.
- Email or SMS delivery.
- CAPTCHA, unless brute-force traffic becomes a real issue.
