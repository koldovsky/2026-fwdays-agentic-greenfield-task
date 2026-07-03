import { NextResponse } from 'next/server';
import { db } from '@/db';
import { conversions } from '@/db/schema';
import { authenticateApiKey, checkActiveSubscription } from '@/lib/auth';
import { validateConversions } from '@/lib/conversions';

export async function POST(request: Request) {
  try {
    // 1. Verify Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // 2. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 3. Authenticate using X-API-Key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-Key header' },
        { status: 401 }
      );
    }

    const user = await authenticateApiKey(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // 4. Check active subscription
    const subscriptionCheck = await checkActiveSubscription(user.id);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        { error: subscriptionCheck.error },
        { status: subscriptionCheck.statusCode }
      );
    }

    // 5. Validate conversions array and fields
    const validationResult = validateConversions(body);
    if (!validationResult.success) {
      if (validationResult.isArrayError) {
        return NextResponse.json(
          { error: validationResult.error },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Validation failed', details: validationResult.errors },
          { status: 400 }
        );
      }
    }

    // 6. Perform batch database insert
    const recordsToInsert = validationResult.records.map((record) => ({
      ...record,
      userId: user.id,
    }));

    await db.insert(conversions).values(recordsToInsert);

    // 7. Return success response
    return NextResponse.json(
      { status: 'ok', inserted: recordsToInsert.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Ingestion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Explicit handlers to return 405 Method Not Allowed for other methods
const methodNotAllowed = () => {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
};

export {
  methodNotAllowed as GET,
  methodNotAllowed as PUT,
  methodNotAllowed as DELETE,
  methodNotAllowed as PATCH,
};
