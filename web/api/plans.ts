const PLAN_ENV: Record<string, string> = {
  calc: "ASAAS_VALUE_CALC",
  funil: "ASAAS_VALUE_FUNIL",
  painel: "ASAAS_VALUE_PAINEL",
  all: "ASAAS_VALUE_ALL",
};

/** Devolve os preços atuais de cada plano (lidos das env vars) pro front-end mostrar no cadastro. */
export async function GET(): Promise<Response> {
  const values: Record<string, number | null> = {};
  for (const [plan, envKey] of Object.entries(PLAN_ENV)) {
    const raw = process.env[envKey];
    values[plan] = raw ? Number(raw) : null;
  }
  return new Response(JSON.stringify(values), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
