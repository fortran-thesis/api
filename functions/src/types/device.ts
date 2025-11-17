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
 */
export const DEVICE_ROLE_MATRIX: Record<DeviceType, string[]> = {
  [DeviceType.MOBILE]: ["user", "farmer", "mycologist"], // Mobile: farmers + mycologists
  [DeviceType.WEBSITE]: ["admin", "mycologist", "curator"], // Website: admins + mycologists + curators
  [DeviceType.UNKNOWN]: [], // Unknown device - deny all
};

/**
 * Extract device type from request
 * Priority: query param > header > User-Agent
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
  if (userAgent.includes("mobile") || userAgent.includes("android") || userAgent.includes("iphone")) {
    return DeviceType.MOBILE;
  }
  if (userAgent.includes("chrome") || userAgent.includes("firefox") || userAgent.includes("safari")) {
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
 */
export const canAccessDevice = (role: string, deviceType: DeviceType): boolean => {
  return DEVICE_ROLE_MATRIX[deviceType]?.includes(role) ?? false;
};

/**
 * Get allowed devices for a given role
 */
export const getAllowedDevices = (role: string): DeviceType[] => {
  return Object.entries(DEVICE_ROLE_MATRIX)
    .filter(([_, roles]) => roles.includes(role))
    .map(([device, _]) => device as DeviceType);
};
