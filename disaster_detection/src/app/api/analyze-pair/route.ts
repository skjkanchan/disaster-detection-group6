import { NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const USE_MOCK =
  process.env.OPENAI_USE_MOCK === "true" || process.env.OPENAI_USE_MOCK === "1";

const MOCK_RESULTS = [
  {
    damage_label: "major",
    explanation:
      "The post-disaster image shows large sections of the roof missing and significant wall damage compared to the pre-disaster baseline. Structural integrity appears severely compromised with visible debris accumulation around the building perimeter.",
  },
  {
    damage_label: "major",
    explanation:
      "Comparing pre- and post-disaster imagery reveals partial structural collapse and heavy roof damage. Multiple exterior walls show visible cracking and displacement, with debris accumulation consistent with major hurricane-force wind damage.",
  },
  {
    damage_label: "major",
    explanation:
      "Significant roof collapse and exterior wall failure are visible in the post-disaster image. Multiple structural elements have shifted or detached, and the building perimeter shows heavy debris consistent with major wind or flood damage.",
  },
  {
    damage_label: "major",
    explanation:
      "The post-disaster image shows severe structural compromise including missing roof sections and compromised load-bearing walls. The extent of damage indicates major impact requiring significant reconstruction efforts.",
  },
];

function randomConfidence(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

const SYSTEM_PROMPT = `You are a disaster damage assessment AI specialized in analyzing satellite and aerial imagery. You will be shown two images of the same location: one taken BEFORE a disaster and one AFTER. Your task is to compare the two images and classify the structural damage to buildings.

Damage classification levels:
- no damage: Structures appear intact with no visible changes between pre and post images
- minor: Slight visible changes — minor roof damage, missing shingles, small debris, light wind damage
- major: Significant structural damage — large roof sections missing, walls compromised, partial collapse visible
- destroyed: Complete structural failure — buildings collapsed, burned to foundation, or completely demolished

Respond ONLY with valid JSON in this exact format, with no extra text:
{
  "damage_label": "<no damage|minor|major|destroyed>",
  "confidence": <number between 0.0 and 1.0>,
  "explanation": "<2-3 sentences describing visible changes between the images and your reasoning>"
}`;

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const preFile = formData.get("preImage") as File | null;
  const postFile = formData.get("postImage") as File | null;

  if (!preFile || !postFile) {
    return NextResponse.json(
      { error: "Both preImage and postImage are required." },
      { status: 400 }
    );
  }

  const toBase64 = async (file: File): Promise<string> => {
    const buffer = Buffer.from(await file.arrayBuffer());
    return buffer.toString("base64");
  };

  if (USE_MOCK) {
    const mock = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
    return NextResponse.json({ ...mock, confidence: randomConfidence(0.75, 0.95) });
  }

  const [preB64, postB64] = await Promise.all([toBase64(preFile), toBase64(postFile)]);
  const preMime = preFile.type || "image/jpeg";
  const postMime = postFile.type || "image/jpeg";

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local." },
      { status: 503 }
    );
  }
  // Use native OpenAI endpoint directly — bypasses OPENAI_BASE_URL which may point to OpenRouter
  const openai = new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "PRE-DISASTER IMAGE (before the event):" },
            {
              type: "image_url",
              image_url: { url: `data:${preMime};base64,${preB64}`, detail: "high" },
            },
            { type: "text", text: "POST-DISASTER IMAGE (after the event):" },
            {
              type: "image_url",
              image_url: { url: `data:${postMime};base64,${postB64}`, detail: "high" },
            },
            {
              type: "text",
              text: "Compare both images carefully and respond with your damage assessment as JSON only.",
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse model response.", raw }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validLabels = ["no damage", "minor", "major", "destroyed"];
    const label = (parsed.damage_label ?? "").toLowerCase().trim();

    if (!validLabels.includes(label)) {
      return NextResponse.json({ error: "Unexpected damage label from model.", raw }, { status: 500 });
    }

    return NextResponse.json({
      damage_label: label,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 });
  }
}
