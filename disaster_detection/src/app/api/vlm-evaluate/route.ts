import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const maxDuration = 60;

const DAMAGE_CATEGORIES = ["no-damage", "minor-damage", "major-damage", "destroyed"];

const SYSTEM_PROMPT = `You are an expert disaster damage assessment AI that analyzes pre- and post-disaster satellite imagery.
Your task is to compare the provided pre-disaster and post-disaster images and assess the level of structural damage.

You MUST respond with valid JSON in this exact format:
{
  "damage_level": "<one of: no-damage, minor-damage, major-damage, destroyed>",
  "confidence": <number between 0 and 1>,
  "summary": "<brief 1-2 sentence description of damage observed>",
  "indicators": ["<visible damage indicator 1>", "<visible damage indicator 2>"],
  "reasoning": "<detailed step-by-step explanation of your assessment>"
}

Damage level definitions:
- no-damage: No visible structural changes between pre and post imagery
- minor-damage: Slight damage visible (e.g., roof damage, broken windows, minor flooding around structure)
- major-damage: Significant structural damage (e.g., partial wall collapse, major roof loss, severe flooding)
- destroyed: Complete or near-complete destruction of the structure`;

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const preImage = formData.get("pre_image") as File | null;
  const postImage = formData.get("post_image") as File | null;

  if (!preImage || !postImage) {
    return NextResponse.json(
      { error: "Both pre_image and post_image are required." },
      { status: 400 }
    );
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  const preBuffer = Buffer.from(await preImage.arrayBuffer());
  const postBuffer = Buffer.from(await postImage.arrayBuffer());
  const preBase64 = preBuffer.toString("base64");
  const postBase64 = postBuffer.toString("base64");
  const preMediaType = (preImage.type || "image/jpeg") as `image/${string}`;
  const postMediaType = (postImage.type || "image/jpeg") as `image/${string}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze these two satellite images. The FIRST image is the PRE-DISASTER state and the SECOND image is the POST-DISASTER state. Compare them carefully and assess the level of structural damage to the buildings or structures visible.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${preMediaType};base64,${preBase64}`,
                detail: "high",
              },
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${postMediaType};base64,${postBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse VLM response", raw: content },
        { status: 500 }
      );
    }

    if (!DAMAGE_CATEGORIES.includes(result.damage_level as string)) {
      result.damage_level = "no-damage";
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `OpenAI request failed: ${msg}` },
      { status: 500 }
    );
  }
}
