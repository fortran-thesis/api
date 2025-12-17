/**
 * Device Types and their allowed roles
 */
export enum DeviceType {
  MOBILE = "mobile", // Dart/Flutter app
  WEBSITE = "website", // Web dashboard
  UNKNOWN = "unknown",
}

/**
 * Role-Device Access Matrix
 * Defines which roles can access which devices
 * Includes both current and legacy role names for backward compatibility
 */
export const DEVICE_ROLE_MATRIX: Record<DeviceType, string[]> = {
  [DeviceType.MOBILE]: ["farmer", "user", "mycologist", "curator"], // Mobile: farmers (legacy: user) + mycologists (legacy: curator)
  [DeviceType.WEBSITE]: ["admin", "administrator", "mycologist", "curator"], // Website: admins (legacy: administrator) + mycologists (legacy: curator)
  [DeviceType.UNKNOWN]: [], // Unknown device - deny all
};

/**
 * Extract device type from request
 * Priority: query param > header > User-Agent > default to WEBSITE for web requests
 */
export const getDeviceType = (req: any): DeviceType => {
  // Check query parameter first (explicit client indication)
  const queryDevice = req.query.device as string;
  if (queryDevice && isValidDeviceType(queryDevice)) {
    return queryDevice as DeviceType;
  }

  // Check custom header
  const headerDevice = req.headers["x-device-type"] as string;
  if (headerDevice && isValidDeviceType(headerDevice)) {
    return headerDevice as DeviceType;
  }

  // Detect from User-Agent
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  
  // Mobile detection (stricter - look for specific mobile indicators)
  if (userAgent.includes("mobile") || userAgent.includes("android") || userAgent.includes("iphone") || 
      userAgent.includes("ipad") || userAgent.includes("windows phone") || userAgent.includes("blackberry")) {
    return DeviceType.MOBILE;
  }
  
  // Web browser detection (Firefox, Chrome, Safari, Edge, Opera, etc.)
  if (userAgent.includes("firefox") || userAgent.includes("chrome") || userAgent.includes("safari") ||
      userAgent.includes("edg/") || userAgent.includes("opera") || userAgent.includes("trident")) {
    return DeviceType.WEBSITE;
  }
  
  // If no User-Agent, check method and path hints
  // POST to /login without explicit mobile device = likely website
  if (req.method === "POST" && req.path?.includes("/login")) {
    // This is a best-effort fallback - website might not send User-Agent in some cases
    // Default to WEBSITE since mobile must send device=mobile query param
    return DeviceType.WEBSITE;
  }

  // Last resort: empty or unrecognized User-Agent - assume WEBSITE for API requests
  // (Mobile app always sends explicit ?device=mobile)
  if (!userAgent || userAgent.length === 0) {
    return DeviceType.WEBSITE;
  }

  return DeviceType.UNKNOWN;
};

/**
 * Check if device type string is valid
 */
const isValidDeviceType = (device: string): boolean => {
  return Object.values(DeviceType).includes(device as DeviceType);
};

/**
 * Check if a role can access a specific device
 * Case-insensitive matching for robustness
 */
export const canAccessDevice = (role: string, deviceType: DeviceType): boolean => {
  const normalizedRole = role?.toLowerCase() ?? "";
  const allowedRoles = DEVICE_ROLE_MATRIX[deviceType] ?? [];
  return allowedRoles.some(allowedRole => allowedRole.toLowerCase() === normalizedRole);
};

/**
 * Get allowed devices for a given role
 */
export const getAllowedDevices = (role: string): DeviceType[] => {
  return Object.entries(DEVICE_ROLE_MATRIX)
    .filter(([_, roles]) => roles.includes(role))
    .map(([device, _]) => device as DeviceType);
};
