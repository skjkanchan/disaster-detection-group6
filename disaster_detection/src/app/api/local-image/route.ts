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



// import { NextRequest, NextResponse } from 'next/server';
// import fs from 'fs';
// import path from 'path';
// import os from 'os';

// export async function GET(request: NextRequest) {
//     const searchParams = request.nextUrl.searchParams;
//     const id = searchParams.get('id');
//     const type = searchParams.get('type'); // 'pre' or 'post'

//     if (!id || !type) {
//         return NextResponse.json({ error: "Missing id or type" }, { status: 400 });
//     }

//     const homeDir = os.homedir();
//     const imagesDir = path.join(homeDir, 'Downloads', 'train 2', 'images');
    
//     // hurricane-matthew_00000085_pre_disaster.png
//     const filename = `hurricane-matthew_${id}_${type}_disaster.png`;
//     const filePath = path.join(imagesDir, filename);

//     if (!fs.existsSync(filePath)) {
//         return NextResponse.json({ error: "File not found" }, { status: 404 });
//     }

//     try {
//         const fileBuffer = fs.readFileSync(filePath);
//         return new NextResponse(fileBuffer, {
//             status: 200,
//             headers: {
//                 'Content-Type': 'image/png',
//                 'Cache-Control': 'public, max-age=31536000'
//             }
//         });
//     } catch (e: any) {
//         return NextResponse.json({ error: e.message }, { status: 500 });
//     }
// }
