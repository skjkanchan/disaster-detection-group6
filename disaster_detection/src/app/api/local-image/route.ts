import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  const res = await fetch(
    `https://boedj5c60e.execute-api.us-east-2.amazonaws.com/default/getLocalImage?id=${id}&type=${type}`
  );
  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "image/png" },
  });
}
