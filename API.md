# API conventions

All routes are under `/api`. Successful responses have `{success:true,data:...}` (some mutations return `message`). Errors have `{success:false,message:...}`. Authenticated calls use `Authorization: Bearer JWT`. The server reloads each account's active status, role, and token version; changing a role or disabling an account takes effect without waiting for token expiry.

| Resource | Operations | Access |
| --- | --- | --- |
| `/auth/register`, `/auth/login` | POST | Public, rate limited; registration accepts customer/supplier only |
| `/auth/google/config` | GET | Public OAuth client ID |
| `/auth/google` | POST credential, optional role | Verified Google ID token; new accounts select customer/supplier |
| `/auth/me`, `/auth/user/:id` | GET | Signed in; user lookup returns ID, name, avatar, role only |
| `/auth/profile`, `/auth/password` | PUT | Own account; password change requires current password |
| `/auth/profile/avatar` | POST multipart avatar | Own account |
| `/auth/forgot-password`, `/auth/reset-password` | POST | Rate limited; hashed expiring single-use tokens |
| `/products`, `/products/:id`, `/products/categories`, `/products/locations/barangays` | GET | Public |
| `/products/geocode/search`, `/products/geocode/reverse` | GET | Public, Roxas location constraints |
| `/products/mine` | GET | Supplier/admin own listings |
| `/products` | POST | Supplier |
| `/products/:id` | PUT, DELETE (deactivate) | Listing supplier or admin |
| `/products/:id/images` | POST multipart image | Listing supplier or admin |
| `/products/:id/images/:imageId` | DELETE | Listing supplier or admin |
| `/products/:id/images/order` | PUT `{image_ids: [...]}` | Listing supplier or admin; include every image once; first becomes primary |
| `/rentals` | GET, POST | Role-filtered list; only customer creates |
| `/rentals/:id` | GET | Customer, listing supplier, admin |
| `/rentals/:id/status` | PUT status, optional notes | Participant and transition rules below |
| `/reviews/product/:productId` | GET | Public |
| `/reviews` | POST JSON or multipart | Customer owns completed rental; one review per rental |
| `/community` | GET, POST | Public read; signed-in authors create |
| `/community/:id/like` | PUT | Signed-in user's like toggle |
| `/favorites`, `/favorites/:productId` | GET, POST, DELETE | Own favorites, active products only |
| `/notifications`, `/notifications/:id/read`, `/notifications/read-all` | GET, PUT | Own notifications |
| `/messages/conversations`, `/messages/:otherUserId`, `/messages/search/conversations` | GET | Own conversations |
| `/messages`, `/messages/image`, `/messages/equipment`, `/messages/location` | POST | Signed-in participant, existing recipient, blocks enforced |
| `/messages/block`, `/messages/block/:userId`, `/messages/block/status/:userId` | POST, DELETE, GET | Own block relationships |
| `/messages/deliver/:messageId` | PUT | Message receiver only |
| `/admin/public-stats` | GET | Public aggregates only |
| `/admin/complaints` | POST | Signed-in reporter |
| `/admin/stats`, `/admin/reports`, `/admin/users`, `/admin/products`, `/admin/rentals`, `/admin/complaints` | GET | Admin |
| `/admin/users` | POST | Admin creates account |
| `/admin/users/:id` | PUT, DELETE (deactivate) | Admin; own admin access and last active admin protected |
| `/admin/products/:id/toggle`, `/admin/complaints/:id` | PUT | Admin |

Rental transitions: customer may cancel pending/approved bookings and mark active rentals returned. Supplier/admin may approve or reject pending requests, activate/cancel approved bookings, record returns, and complete returned rentals. Dates and product locks are checked within transactions. Browser-supplied prices, deposits, and statuses do not control booking creation. `is_overdue` is derived, not a client-writable state.

Socket connections pass `{auth:{token}}` in the handshake. User rooms derive from verified JWT identity. Typing, online status, read receipts, and delivery events require conversation participation and enforce blocks. HTTP persists messages and notifications so reconnects can reload them.

Uploads accept JPEG, PNG, and WebP up to 5 MB, with extension, MIME, and signature checks. Production uploads require Cloudinary. `/health` and `/ready` are outside `/api`.

Pagination: product and community lists use `page` and `limit` inside their existing data envelopes. Admin lists keep `data` as an array and return a separate `pagination` object. Rental lists accept `page`, `limit`, and `status` (including `overdue`); they also return `hasMore`, all-history status `summary`, and aggregated seven-day scheduled `activity`. Conversation messages accept `limit` and `before=<message ID>` and return `hasMore`; notifications accept `page` and `limit`. Page sizes are bounded on the server.

Image storage tracks new uploads for cleanup on rejected requests, avatar replacement, and image deletion. Unregistered legacy files are preserved for manual migration. Deactivating a listing preserves its historical images and rental records. Request rate limits remain enabled in tests, which pause between browser batches.
