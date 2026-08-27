import Stripe from "stripe";

/**
 * Cria uma sessão de Checkout do Stripe pra uma conta assinar (ou renovar) o Converteu.
 * O front-end chama isso e redireciona pro `url` retornado.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: { accountId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const { accountId, email } = body;
  if (!accountId || !email) {
    return new Response("accountId e email são obrigatórios", { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !priceId) {
    return new Response("Configuração do Stripe incompleta no servidor.", { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  const origin = req.headers.get("origin") || "https://web-kappa-three-73.vercel.app";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: accountId,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { accountId } },
      success_url: `${origin}/?checkout=sucesso`,
      cancel_url: `${origin}/?checkout=cancelado`,
    });
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Falha ao criar sessão de checkout", err);
    return new Response("Não foi possível iniciar o pagamento.", { status: 500 });
  }
}
