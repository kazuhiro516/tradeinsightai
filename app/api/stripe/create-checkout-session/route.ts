import { NextResponse } from 'next/server';
import { stripe, SUBSCRIPTION_PRICE_ID } from '@/lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { email, id: userId } = session.user;

    if (!SUBSCRIPTION_PRICE_ID) {
      throw new Error('SUBSCRIPTION_PRICE_ID is not set');
    }

    // Checkoutセッションの作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: email || undefined,
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: userId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
