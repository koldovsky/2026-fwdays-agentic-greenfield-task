import crypto from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.TELEGRAM_BOT_WEBHOOK_SECRET || 'super_secret_webhook_token_123';

async function testFlows() {
  console.log('--- Starting Auth Flows Verification ---');
  
  // We'll perform HTTP requests to the local dev server.
  // Note: This script assumes the Next.js server is running and the database is accessible.
  // If the database is offline, it will fail gracefully with clear logs.

  try {
    // 1. Initialise Registration
    console.log('\n[Step 1] Initialising registration...');
    const regRes = await fetch(`${APP_URL}/api/auth/register-token`, {
      method: 'POST',
    });
    
    if (!regRes.ok) {
      throw new Error(`Failed to generate token: ${regRes.status}`);
    }
    
    const { token } = await regRes.json();
    console.log(`✓ Registration token generated: ${token}`);

    // 2. Simulate Telegram Webhook start
    console.log('\n[Step 2] Simulating Telegram /start command...');
    const startPayload = {
      update_id: 10001,
      message: {
        message_id: 2001,
        from: {
          id: 999999999,
          is_bot: false,
          first_name: 'TestUser',
          username: 'test_user',
        },
        chat: {
          id: 999999999,
          type: 'private',
        },
        date: Math.floor(Date.now() / 1000),
        text: `/start reg_${token}`,
      },
    };

    const webhookRes = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
      },
      body: JSON.stringify(startPayload),
    });

    if (!webhookRes.ok) {
      throw new Error(`Webhook /start failed: ${webhookRes.status}`);
    }
    
    const startResult = await webhookRes.json();
    console.log('✓ Webhook accepted /start:', startResult);

    // 3. Simulate Invalid Email
    console.log('\n[Step 3] Sending invalid email...');
    const invalidEmailPayload = {
      update_id: 10002,
      message: {
        ...startPayload.message,
        message_id: 2002,
        text: 'invalid-email-format',
      },
    };

    const badEmailRes = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
      },
      body: JSON.stringify(invalidEmailPayload),
    });
    console.log('✓ Webhook accepted invalid email:', await badEmailRes.json());

    // 4. Simulate Valid Email
    console.log('\n[Step 4] Sending valid email...');
    const testEmail = `test_${crypto.randomBytes(4).toString('hex')}@example.com`;
    const validEmailPayload = {
      update_id: 10003,
      message: {
        ...startPayload.message,
        message_id: 2003,
        text: testEmail,
      },
    };

    const goodEmailRes = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
      },
      body: JSON.stringify(validEmailPayload),
    });
    console.log('✓ Webhook accepted valid email:', await goodEmailRes.json());

    // 5. Simulate Invalid Website
    console.log('\n[Step 5] Sending invalid website...');
    const invalidWebPayload = {
      update_id: 10004,
      message: {
        ...startPayload.message,
        message_id: 2004,
        text: 'not_a_website_url',
      },
    };

    const badWebRes = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
      },
      body: JSON.stringify(invalidWebPayload),
    });
    console.log('✓ Webhook accepted invalid website URL:', await badWebRes.json());

    // 6. Simulate Valid Website & Complete Registration
    console.log('\n[Step 6] Sending valid website URL to complete registration...');
    const testWeb = 'my-business-site.com';
    const validWebPayload = {
      update_id: 10005,
      message: {
        ...startPayload.message,
        message_id: 2005,
        text: testWeb,
      },
    };

    const goodWebRes = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
      },
      body: JSON.stringify(validWebPayload),
    });
    console.log('✓ Webhook accepted valid website URL:', await goodWebRes.json());

    // 7. Verify Client-side Polling
    console.log('\n[Step 7] Testing registration polling endpoint...');
    const pollRes = await fetch(`${APP_URL}/api/auth/poll-registration?token=${token}`);
    const pollData = await pollRes.json();
    console.log('✓ Polling response:', pollData);
    if (!pollData.completed) {
      throw new Error('Polling failed: registration should have been marked complete');
    }

    // 8. Test OTP Login Flow (Requesting Code)
    console.log('\n[Step 8] Requesting OTP code for the user...');
    const otpRequestRes = await fetch(`${APP_URL}/api/auth/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const otpRequestData = await otpRequestRes.json();
    console.log('✓ OTP Request response:', otpRequestData);

    // 9. Test Magic Link Flow (Requesting Link)
    console.log('\n[Step 9] Requesting Magic Link for the user...');
    const magicRequestRes = await fetch(`${APP_URL}/api/auth/magic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const magicRequestData = await magicRequestRes.json();
    console.log('✓ Magic Link Request response:', magicRequestData);

    console.log('\n--- All flows verified successfully ---');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Verification failed:', message);
    console.log('\nNote: Ensure the local development server is running ("npm run dev") and the database is online before running verification.');
  }
}

testFlows();
