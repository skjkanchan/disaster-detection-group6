export const dynamic = 'force-dynamic';

export async function GET() {
  const res = await fetch(
    "https://0qdc5t28wa.execute-api.us-east-2.amazonaws.com/default/getMatthewMetadata",
    { cache: 'no-store' }
  );
  const data = await res.json();
  return Response.json(data);
}
