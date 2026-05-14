export async function GET() {
  const res = await fetch(
    "https://qsa092foyk.execute-api.us-east-2.amazonaws.com/default/getMatthewBuildings"
  );
  const data = await res.json();
  return Response.json(data);
}
