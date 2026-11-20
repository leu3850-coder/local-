import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/music/generate', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(400).json({
        error:
          'GEMINI_API_KEY is not configured. Open Settings > Secrets in AI Studio to attach a billing-enabled Gemini API key for Lyria music generation.',
      });
      return;
    }

    const promptInput = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    const mode = req.body?.mode === 'pro' ? 'pro' : 'clip';

    if (!promptInput) {
      res.status(400).json({ error: 'Please provide a music style or jingle prompt.' });
      return;
    }

    const model = mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const responseStream = await ai.models.generateContentStream({
        model,
        contents: promptInput,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(502).json({
          error: 'No audio data was returned by the Lyria model. Try refining your prompt.',
        });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      res.json({
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        lyrics: lyrics.trim(),
        model,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isQuotaOrBilling =
        message.includes('429') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('403') ||
        message.includes('PERMISSION_DENIED') ||
        message.toLowerCase().includes('billing');

      res.status(isQuotaOrBilling ? 402 : 500).json({
        error: isQuotaOrBilling
          ? 'Lyria music generation requires a billing-enabled Gemini API key. Select a paid API key in Settings > Secrets and try again.'
          : `Music generation failed: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stack House server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
