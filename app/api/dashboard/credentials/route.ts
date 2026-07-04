import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Неавторизовано' }, { status: 401 });
    }

    return NextResponse.json({
      crmUrl: user.crmUrl,
      crmLogin: user.crmLogin,
      hasCrmPassword: !!user.crmPassword,
      telephonyUrl: user.telephonyUrl,
      telephonyLogin: user.telephonyLogin,
      hasTelephonyPassword: !!user.telephonyPassword,
      hasTelephonyApiKey: !!user.telephonyApiKey,
    });
  } catch (error) {
    console.error('Fetch credentials error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Неавторизовано' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Некоректний JSON' }, { status: 400 });
    }

    let {
      crmUrl,
      crmLogin,
      crmPassword,
      telephonyUrl,
      telephonyLogin,
      telephonyPassword,
      telephonyApiKey,
    } = body;

    // Clean values
    crmUrl = crmUrl?.trim() || null;
    crmLogin = crmLogin?.trim() || null;
    crmPassword = crmPassword || null;
    telephonyUrl = telephonyUrl?.trim() || null;
    telephonyLogin = telephonyLogin?.trim() || null;
    telephonyPassword = telephonyPassword || null;
    telephonyApiKey = telephonyApiKey || null;

    const errors: Record<string, string> = {};

    // Validation helper for URL
    const validateUrl = (url: string | null, field: string) => {
      if (!url) return;
      if (!url.startsWith('https://')) {
        errors[field] = 'Посилання обов’язково повинно використовувати протокол https://';
        return;
      }
      try {
        new URL(url);
      } catch {
        errors[field] = 'Некоректний формат URL-адреси';
      }
    };

    validateUrl(crmUrl, 'crmUrl');
    validateUrl(telephonyUrl, 'telephonyUrl');

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Determine updates
    const updateData: Partial<typeof user> = {
      crmUrl,
      crmLogin,
      telephonyUrl,
      telephonyLogin,
      updatedAt: new Date(),
    };

    // CRM credentials update logic
    if (!crmUrl || !crmLogin) {
      updateData.crmUrl = null;
      updateData.crmLogin = null;
      updateData.crmPassword = null;
    } else {
      if (crmPassword && crmPassword !== '••••••••') {
        updateData.crmPassword = encrypt(crmPassword);
      }
    }

    // Telephony credentials update logic
    if (!telephonyUrl || !telephonyLogin) {
      updateData.telephonyUrl = null;
      updateData.telephonyLogin = null;
      updateData.telephonyPassword = null;
      updateData.telephonyApiKey = null;
    } else {
      if (telephonyPassword && telephonyPassword !== '••••••••') {
        updateData.telephonyPassword = encrypt(telephonyPassword);
      }
      if (telephonyApiKey && telephonyApiKey !== '••••••••') {
        updateData.telephonyApiKey = encrypt(telephonyApiKey);
      }
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save credentials error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
