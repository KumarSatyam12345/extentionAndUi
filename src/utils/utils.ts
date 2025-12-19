export const SENSITIVE_KEYS = [
"password", "pass", "pwd", "pin", "otp", "secret", "token", "authorization", "auth"
];

export function maskSensitive<T>(data: T): T {
if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) return data.map(maskSensitive) as any;

  const masked: any = {};
  for (const key in data) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) masked[key] = "******";
    else if (typeof (data as any)[key] === "object") masked[key] = maskSensitive((data as any)[key]);
    else masked[key] = (data as any)[key];
  }
  return masked;
}

export const normalizeArray = <T>(data: T | T[] | null | undefined): T[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return [data];
  return [];
};

export const renderValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(maskSensitive(value), null, 2);
  return String(value);
};
