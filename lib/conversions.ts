export interface ValidationError {
  index: number;
  field: string;
  message: string;
}

export interface ValidatedConversion {
  date: string;
  conversionTime: Date;
  conversionName: string;
  isAdConversion: boolean;
  email: string | null;
  phone: string | null;
  conversionValue: string | null;
  orderId: string | null;
  ipAddress: string | null;
  adSource: string | null;
  channel: string | null;
}

export function validateConversions(data: unknown):
  | { success: true; records: ValidatedConversion[] }
  | { success: false; isArrayError: boolean; error?: string; errors?: ValidationError[] } {
  
  if (!Array.isArray(data)) {
    return {
      success: false,
      isArrayError: true,
      error: 'conversions array must contain at least 1 and at most 500 items',
    };
  }

  if (data.length === 0 || data.length > 500) {
    return {
      success: false,
      isArrayError: true,
      error: 'conversions array must contain at least 1 and at most 500 items',
    };
  }

  const errors: ValidationError[] = [];
  const records: ValidatedConversion[] = [];

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item !== 'object' || item === null) {
      errors.push({
        index: i,
        field: 'body',
        message: 'must be an object',
      });
      continue;
    }

    const {
      date,
      conversionTime,
      conversionName,
      isAdConversion,
      email,
      phone,
      conversionValue,
      orderId,
      ipAddress,
      adSource,
      channel,
    } = item as Record<string, unknown>;

    // 1. Validate date
    if (date === undefined || date === null) {
      errors.push({ index: i, field: 'date', message: 'date is required' });
    } else if (typeof date !== 'string') {
      errors.push({ index: i, field: 'date', message: 'must be a string' });
    } else if (!dateRegex.test(date)) {
      errors.push({ index: i, field: 'date', message: 'must be in YYYY-MM-DD format' });
    } else if (isNaN(Date.parse(date))) {
      errors.push({ index: i, field: 'date', message: 'must be a valid calendar date' });
    }

    // 2. Validate conversionTime
    if (conversionTime === undefined || conversionTime === null) {
      errors.push({ index: i, field: 'conversionTime', message: 'conversionTime is required' });
    } else if (typeof conversionTime !== 'string') {
      errors.push({ index: i, field: 'conversionTime', message: 'must be a string' });
    } else {
      const parsedTime = Date.parse(conversionTime);
      if (isNaN(parsedTime)) {
        errors.push({ index: i, field: 'conversionTime', message: 'must be a valid ISO 8601 timestamp' });
      } else {
        const timeDiff = parsedTime - Date.now();
        if (timeDiff > 24 * 60 * 60 * 1000) {
          errors.push({
            index: i,
            field: 'conversionTime',
            message: 'conversionTime must not be more than 24 hours in the future',
          });
        }
      }
    }

    // 3. Validate conversionName
    if (conversionName === undefined || conversionName === null) {
      errors.push({ index: i, field: 'conversionName', message: 'conversionName is required' });
    } else if (typeof conversionName !== 'string') {
      errors.push({ index: i, field: 'conversionName', message: 'must be a string' });
    } else if (conversionName.trim().length === 0) {
      errors.push({ index: i, field: 'conversionName', message: 'must not be empty' });
    }

    // 4. Validate isAdConversion
    if (isAdConversion === undefined || isAdConversion === null) {
      errors.push({ index: i, field: 'isAdConversion', message: 'isAdConversion is required' });
    } else if (typeof isAdConversion !== 'boolean') {
      errors.push({ index: i, field: 'isAdConversion', message: 'must be a boolean' });
    }

    // 5. Optional fields
    if (email !== undefined && email !== null && typeof email !== 'string') {
      errors.push({ index: i, field: 'email', message: 'must be a string' });
    }
    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      errors.push({ index: i, field: 'phone', message: 'must be a string' });
    }
    if (conversionValue !== undefined && conversionValue !== null && typeof conversionValue !== 'number') {
      errors.push({ index: i, field: 'conversionValue', message: 'must be a number' });
    }
    if (orderId !== undefined && orderId !== null && typeof orderId !== 'string') {
      errors.push({ index: i, field: 'orderId', message: 'must be a string' });
    }
    if (ipAddress !== undefined && ipAddress !== null && typeof ipAddress !== 'string') {
      errors.push({ index: i, field: 'ipAddress', message: 'must be a string' });
    }
    if (adSource !== undefined && adSource !== null && typeof adSource !== 'string') {
      errors.push({ index: i, field: 'adSource', message: 'must be a string' });
    }
    if (channel !== undefined && channel !== null && typeof channel !== 'string') {
      errors.push({ index: i, field: 'channel', message: 'must be a string' });
    }

    if (errors.length === 0) {
      records.push({
        date: date as string,
        conversionTime: new Date(conversionTime as string),
        conversionName: (conversionName as string).trim(),
        isAdConversion: isAdConversion as boolean,
        email: typeof email === 'string' ? email : null,
        phone: typeof phone === 'string' ? phone : null,
        conversionValue: typeof conversionValue === 'number' ? conversionValue.toString() : null,
        orderId: typeof orderId === 'string' ? orderId : null,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
        adSource: typeof adSource === 'string' ? adSource : null,
        channel: typeof channel === 'string' ? channel : null,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, isArrayError: false, errors };
  }

  return { success: true, records };
}
