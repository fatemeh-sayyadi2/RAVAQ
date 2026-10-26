import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cohesive Visual Asset Batch Generator for RAVĀQ (رَواق)
 * Brand Identity:
 * - Burgundy: #742E3A
 * - Warm Ivory: #F8F4EC
 * - Muted Turquoise: #2D8C88
 * - Natural Walnut Wood & Restrained Antique Brass (#B89A62)
 * - Blank label area or exact RAVĀQ spelling
 */
interface AssetSpec {
  id: string;
  filename: string;
  aspectRatio: '4:3' | '16:9' | '1:1';
  prompt: string;
}

const HOMEPAGE_ASSETS: AssetSpec[] = [
  {
    id: 'gift-boxes',
    filename: 'gift-boxes.jpg',
    aspectRatio: '4:3',
    prompt:
      'Commercial luxury studio product photography for RAVĀQ, a contemporary Iranian gourmet and gifting boutique. A signature rigid luxury gift box with a deep matte burgundy (#742E3A) base and a warm ivory (#F8F4EC) overhanging lid, wrapped with a burgundy silk ribbon and a restrained brushed antique brass (#B89A62) clasp. Clean blank warm ivory rectangular label plaque with no text. Placed on a natural walnut wood console in front of a warm ivory plaster architectural arch with soft golden-hour sunlight and realistic shadows. Photorealistic commercial campaign, 85mm lens, no text.',
  },
  {
    id: 'nuts-dried-fruits',
    filename: 'nuts-dried-fruits.jpg',
    aspectRatio: '4:3',
    prompt:
      'Commercial luxury studio food photography for RAVĀQ, a contemporary Iranian gourmet boutique. Hand-selected roasted Iranian pistachios in natural ivory shells with emerald green kernels, alongside dried figs, golden apricots, and whole almonds, artfully arranged in a muted turquoise (#2D8C88) glazed ceramic dish beside a matte burgundy (#742E3A) cylindrical boutique canister with a brushed antique brass (#B89A62) lid and a blank warm ivory (#F8F4EC) label with no text. Set on a natural walnut wood table against a warm ivory plaster background with soft golden-hour sunlight. Photorealistic, no text.',
  },
  {
    id: 'saffron-select-foods',
    filename: 'saffron-select-foods.jpg',
    aspectRatio: '4:3',
    prompt:
      'Commercial luxury studio product photography for RAVĀQ, a contemporary Iranian gourmet brand. Vivid crimson whole Iranian saffron threads inside a faceted crystal glass apothecary jar with a brushed antique brass (#B89A62) lid, resting next to its open matte burgundy (#742E3A) and warm ivory (#F8F4EC) presentation box on a natural walnut wood tray. A small antique brass mortar and a few loose crimson saffron strands sit beside the jar. Blank warm ivory packaging surface with no text. Warm ivory plaster background, golden-hour lighting, photorealistic macro detail.',
  },
  {
    id: 'traditional-sweets',
    filename: 'traditional-sweets.jpg',
    aspectRatio: '4:3',
    prompt:
      'Commercial luxury studio food photography for RAVĀQ, a contemporary Iranian gourmet boutique. An elegant assortment of traditional Persian sweets: white Isfahan Gaz nougat studded with green pistachio kernels, golden saffron Sohan brittle topped with slivered pistachios, and diamond-cut Persian baklava. Presented on a warm ivory (#F8F4EC) handmade ceramic platter with antique brass (#B89A62) rim beside a matte burgundy (#742E3A) boutique box with a blank ivory label on a natural walnut wood table. Soft warm sunlight, photorealistic food styling, no text.',
  },
  {
    id: 'iranian-handicrafts',
    filename: 'iranian-handicrafts.jpg',
    aspectRatio: '4:3',
    prompt:
      'Commercial luxury studio still-life photography of contemporary Iranian artisan gifts for RAVĀQ. A handcrafted muted turquoise (#2D8C88) glazed ceramic bowl with subtle antique brass rim detail and a sculptural warm terracotta vessel resting on a cream (#EFE5D6) handwoven linen table runner over a natural walnut wood surface. Behind them is a recessed warm ivory (#F8F4EC) Iranian architectural arch niche bathed in warm golden-hour sunlight and soft shadows. Photorealistic editorial campaign, no text.',
  },
  {
    id: 'occasion-gifts',
    filename: 'occasion-gifts.jpg',
    aspectRatio: '4:3',
    prompt:
      'Commercial luxury studio photography of a curated Iranian occasion gift box set on natural walnut wood. An open matte burgundy (#742E3A) and warm ivory (#F8F4EC) luxury gift hamper revealing neatly compartmentalized glass jars of Iranian pistachios, crimson saffron, dried fruits, traditional sweets, and a small muted turquoise (#2D8C88) ceramic bowl, accented with antique brass (#B89A62) details and a burgundy silk ribbon. All labels are clean blank warm ivory with no text. Warm ivory architectural background, golden-hour lighting, photorealistic.',
  },
];

function detectExtension(buffer: Buffer, mimeType?: string): 'jpg' | 'png' | 'webp' {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  return 'jpg';
}

async function generateAll() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const outDir = path.resolve(process.cwd(), 'public/assets/categories');
  fs.mkdirSync(outDir, { recursive: true });

  const results: Array<{ id: string; filePath: string; bytes: number; ext: string }> = [];

  for (const spec of HOMEPAGE_ASSETS) {
    console.log(`Generating ${spec.id}...`);
    const interaction = await ai.interactions.create({
      model: 'gemini-nano-banana-2.1',
      input: spec.prompt,
      response_modalities: ['image'],
      generation_config: {
        image_config: {
          aspect_ratio: spec.aspectRatio,
          image_size: '1K',
        },
      },
    });

    let base64Data: string | null = null;
    let mimeType: string | undefined;

    if (interaction.output_image?.data) {
      base64Data = interaction.output_image.data;
      mimeType = interaction.output_image.mime_type;
    } else {
      for (const step of interaction.steps || []) {
        if (step.type === 'model_output') {
          const imgPart = step.content?.find((c: { type?: string }) => c.type === 'image');
          if (imgPart && 'data' in imgPart && typeof imgPart.data === 'string') {
            base64Data = imgPart.data;
            mimeType = 'mime_type' in imgPart ? String(imgPart.mime_type) : undefined;
            break;
          }
        }
      }
    }

    if (!base64Data) {
      throw new Error(`No image data returned for ${spec.id}`);
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const actualExt = detectExtension(buffer, mimeType);
    const finalFilename = `${spec.id}.${actualExt}`;
    const fullPath = path.join(outDir, finalFilename);
    fs.writeFileSync(fullPath, buffer);

    const stat = fs.statSync(fullPath);
    console.log(`Saved ${fullPath} (${stat.size} bytes, format=${actualExt})`);
    results.push({ id: spec.id, filePath: `/assets/categories/${finalFilename}`, bytes: stat.size, ext: actualExt });
  }

  console.log('Batch generation complete:', JSON.stringify(results, null, 2));
}

generateAll().catch((err) => {
  console.error('Batch generation failed:', err?.message || err);
  process.exit(1);
});
