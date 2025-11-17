# Device-Based RBAC (Role-Based Access Control) Implementation

## Overview

This system implements device-based access control for your API, where different user roles have access to different client applications (mobile app vs. web dashboard).

## Device Types & Role Matrix

### Supported Devices
- **Mobile** (`mobile`): Dart/Flutter mobile app
- **Website** (`website`): Web dashboard/admin panel
- **Unknown**: Unrecognized device (denied access)

### Role Access Matrix

| Role | Mobile | Website |
|------|--------|---------|
| `user` / `farmer` | ✅ YES | ❌ NO |
| `mycologist` | ✅ YES | ✅ YES |
| `curator` | ❌ NO | ✅ YES |
| `admin` | ❌ NO | ✅ YES |

## How It Works

### 1. Device Type Detection (Priority Order)
The API detects device type using this priority:

1. **Query Parameter** - Explicit client indication
   ```
   POST /api/v1/auth/login?device=mobile
   ```

2. **Custom Header** - For more explicit control
   ```
   Headers:
   X-Device-Type: website
   ```

3. **User-Agent** - Automatic detection
   ```
   User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS...)
   User-Agent: Mozilla/5.0 (X11; Linux x86_64) Chrome/...
   ```

### 2. Login Flow with Device Checking

```
Client Request (Login)
    ↓
Device Type Detection (verifyDevice middleware)
    ↓
Authenticate User (identifyUser)
    ↓
Check Role-Device Access (in authenticateUser service)
    ↓
✅ Access Granted → Set Session Cookie
❌ Access Denied → Return 403 Forbidden
```

### 3. Protection on Other Endpoints

For additional protection on resource endpoints:

```typescript
router.get(
  "/api/v1/protected-resource",
  verifyUser(),           // Check authentication
  verifyDeviceAccess(),   // Check device access
  handler
);
```

## Implementation Details

### Key Files

1. **`types/device.ts`**
   - `DeviceType` enum
   - `DEVICE_ROLE_MATRIX` - Role-device mapping
   - Helper functions: `canAccessDevice()`, `getDeviceType()`, `getAllowedDevices()`

2. **`middlewares/deviceVerification.ts`**
   - `verifyDevice()` - Middleware to detect device type
   - `verifyDeviceAccess()` - Middleware to enforce device-role access

3. **`services/authService.ts`**
   - Enhanced `authenticateUser()` to accept device type and validate access

4. **`controllers/authController.ts`**
   - Updated `loginUser()` and `oAuth()` to check device access

5. **`routes/authRoutes.ts`**
   - Routes now include `verifyDevice()` middleware

## Client Implementation Examples

### Mobile App (Dart/Flutter)

```dart
// Option 1: Send device type in query parameter
final response = await http.post(
  Uri.parse('https://api.example.com/api/v1/auth/login?device=mobile'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'username': 'farmer_user',
    'password': 'password123'
  }),
);

// Option 2: Send custom header
final response = await http.post(
  Uri.parse('https://api.example.com/api/v1/auth/login'),
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Type': 'mobile',
  },
  body: jsonEncode({
    'username': 'farmer_user',
    'password': 'password123'
  }),
);
```

### Web Dashboard (JavaScript)

```javascript
// Option 1: Query parameter
const response = await fetch(
  'https://api.example.com/api/v1/auth/login?device=website',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'admin_user',
      password: 'password123'
    })
  }
);

// Option 2: Custom header
const response = await fetch(
  'https://api.example.com/api/v1/auth/login',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Type': 'website',
    },
    body: JSON.stringify({
      username: 'admin_user',
      password: 'password123'
    })
  }
);
```

## Error Responses

### Device Access Denied (403)
```json
{
  "success": false,
  "error": "Your role is not permitted to access this application"
}
```

### Authentication Failure
```json
{
  "success": false,
  "error": "Incorrect credentials"
}
```

## Adding Custom Device Types

To add a new device type:

1. Update `types/device.ts`:
```typescript
export enum DeviceType {
  MOBILE = "mobile",
  WEBSITE = "website",
  ADMIN_PANEL = "admin-panel",  // New
  UNKNOWN = "unknown",
}

export const DEVICE_ROLE_MATRIX: Record<DeviceType, string[]> = {
  [DeviceType.MOBILE]: ["user", "farmer", "mycologist"],
  [DeviceType.WEBSITE]: ["admin", "mycologist", "curator"],
  [DeviceType.ADMIN_PANEL]: ["admin"],  // New
  [DeviceType.UNKNOWN]: [],
};
```

2. Update User-Agent detection in `getDeviceType()` if needed

## Security Considerations

✅ **Device Type is Not Authentication** - Device type is detected from headers/query params and is not cryptographically verified. It works as an application-level control.

✅ **Role Remains Canonical** - User roles in Firestore/Firebase Auth are the source of truth. Device restrictions are an additional layer.

✅ **Double Validation** - Both login endpoint AND resource endpoints should validate device access for defense-in-depth.

✅ **Audit Logging** - Consider logging failed device access attempts for security monitoring.

## Testing Device Access

```bash
# Test mobile access with farmer role (should succeed)
curl -X POST http://localhost:5000/api/v1/auth/login?device=mobile \
  -H "Content-Type: application/json" \
  -d '{"username": "farmer1", "password": "pass"}'

# Test website access with farmer role (should fail with 403)
curl -X POST http://localhost:5000/api/v1/auth/login?device=website \
  -H "Content-Type: application/json" \
  -d '{"username": "farmer1", "password": "pass"}'

# Test website access with admin role (should succeed)
curl -X POST http://localhost:5000/api/v1/auth/login?device=website \
  -H "Content-Type: application/json" \
  -d '{"username": "admin1", "password": "pass"}'
```

## Future Enhancements

- Store device preference in user profile
- Implement device fingerprinting for additional security
- Add device-specific rate limiting
- Log successful/failed device access by user
- Support for multiple simultaneous devices per user
