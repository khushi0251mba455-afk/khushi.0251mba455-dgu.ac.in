import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = 'gemini-4-hydrogen';

const SYSTEM_INSTRUCTION = [
  'You are the Strategy Challenger inside NEXUS Venture Studio.',
  'Your sole job is to stress-test the student founder’s competitive positioning strictly using the information already entered in their Venture Profile, Competitor Research, Competitor Matrix, Evidence/Sources, Positioning Map, and Positioning Statement.',
  'STRICT PROHIBITIONS:',
  '- NEVER invent competitors, prices, customer behaviour, market facts, survey results, statistics, or external evidence.',
  '- NEVER claim the venture has capabilities, traction, or features that are not explicitly written in the provided dossier.',
  '- NEVER rewrite the user’s strategy as a polished answer or predict whether the venture will succeed or fail.',
  '- NEVER ask generic textbook entrepreneurship questions; every question and critique must cite specific names, gaps, scores, or claims from the provided dossier.',
  'Keep all responses concise, direct, analytical, and strictly grounded in the user-supplied dossier.',
].join('\n');

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 500, message: raw };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Gemini API key was rejected. Please verify your API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API rate limit or quota exceeded. Please wait a moment and try again.',
    };
  }
  return {
    status: 502,
    message: raw || 'Unable to reach Gemini Strategy Challenger.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/strategy-challenge/questions', async (req: Request, res: Response) => {
    try {
      const { dossier } = req.body as { dossier?: unknown };
      if (!dossier) {
        res.status(400).json({ error: 'Missing venture strategy dossier.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = [
        'Review the following venture dossier entered by the user:',
        JSON.stringify(dossier, null, 2),
        '',
        'Generate exactly 3 difficult, concrete challenge questions about the venture’s competitive position.',
        'Each question must reference specific items from the dossier (such as named alternatives, documented weaknesses, Evidence Quality ratings, Positioning Map scores/distances, or claims in the Positioning Statement).',
        'Focus across high-stakes strategic challenges such as: why target customers would switch from the named alternative, whether differentiation holds if a competitor copies the key offer, underestimated substitutes or Do-Nothing inertia, consistency between Positioning Map scores and Positioning Statement, or claims lacking strong evidence.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    focusArea: {
                      type: Type.STRING,
                      description:
                        'Short 2-5 word topic label for this challenge (e.g. Switching Motivation, Positioning Map Consistency, Do-Nothing Inertia).',
                    },
                    question: {
                      type: Type.STRING,
                      description:
                        'A specific, probing challenge question grounded strictly in the provided venture dossier.',
                    },
                  },
                  required: ['focusArea', 'question'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        questions?: Array<{ focusArea: string; question: string }>;
      };

      const questions = Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, 3).map((q, idx) => ({
            id: `q-${idx + 1}`,
            focusArea: String(q.focusArea || `Challenge ${idx + 1}`).trim(),
            question: String(q.question || '').trim(),
          }))
        : [];

      if (questions.length !== 3 || questions.some((q) => !q.question)) {
        res.status(502).json({
          error: 'Gemini returned an incomplete set of challenge questions. Please try again.',
        });
        return;
      }

      res.json({ questions });
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/strategy-challenge/feedback', async (req: Request, res: Response) => {
    try {
      const { dossier, question, userDefense } = req.body as {
        dossier?: unknown;
        question?: string;
        userDefense?: string;
      };

      if (!dossier || !question || !userDefense?.trim()) {
        res.status(400).json({
          error: 'Dossier, challenge question, and user defence are required.',
        });
        return;
      }

      const ai = getGeminiClient();
      const prompt = [
        'VENTURE DOSSIER (ONLY SOURCE OF TRUTH):',
        JSON.stringify(dossier, null, 2),
        '',
        `CHALLENGE QUESTION: ${question}`,
        `USER DEFENCE: ${userDefense.trim()}`,
        '',
        'Evaluate the user defence strictly against the venture dossier above.',
        'Provide concise, specific feedback under exactly three fields:',
        '1. supported: State what in the user defence is supported by information or evidence already entered in the dossier. If nothing in the defence is backed by entered evidence, state that explicitly.',
        '2. assumption: Identify any claim in the user defence that is not sufficiently supported by the evidence already entered.',
        '3. nextEvidenceNeeded: State what additional evidence, observation, customer feedback, or market information the founder should gather next to test that assumption—without inventing the missing evidence.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supported: {
                type: Type.STRING,
                description:
                  'Concise statement of what in the defence is supported by entered dossier data.',
              },
              assumption: {
                type: Type.STRING,
                description:
                  'Concise identification of claims not sufficiently supported by entered evidence.',
              },
              nextEvidenceNeeded: {
                type: Type.STRING,
                description:
                  'Concise description of real evidence, observation, or customer feedback needed to test the assumption.',
              },
            },
            required: ['supported', 'assumption', 'nextEvidenceNeeded'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        supported?: string;
        assumption?: string;
        nextEvidenceNeeded?: string;
      };

      if (
        !parsed.supported?.trim() ||
        !parsed.assumption?.trim() ||
        !parsed.nextEvidenceNeeded?.trim()
      ) {
        res.status(502).json({
          error: 'Gemini returned incomplete feedback. Please try submitting again.',
        });
        return;
      }

      res.json({
        supported: parsed.supported.trim(),
        assumption: parsed.assumption.trim(),
        nextEvidenceNeeded: parsed.nextEvidenceNeeded.trim(),
      });
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/strategy-challenge/review', async (req: Request, res: Response) => {
    try {
      const { dossier, rounds } = req.body as {
        dossier?: unknown;
        rounds?: unknown;
      };

      if (!dossier || !Array.isArray(rounds) || rounds.length < 3) {
        res.status(400).json({
          error: 'Complete dossier and all 3 challenge rounds are required.',
        });
        return;
      }

      const ai = getGeminiClient();
      const prompt = [
        'VENTURE DOSSIER (ONLY SOURCE OF TRUTH):',
        JSON.stringify(dossier, null, 2),
        '',
        'COMPLETED 3-ROUND STRATEGY CHALLENGE:',
        JSON.stringify(rounds, null, 2),
        '',
        'Provide a concise Final Strategy Review strictly grounded in the user’s existing work and challenge defences.',
        'Do NOT predict whether the venture will succeed or fail, and do NOT invent facts or rewrite the strategy.',
        'Return exactly three fields:',
        '1. strongestPart: The strongest part of the strategy supported solely by existing entered work.',
        '2. biggestAssumption: The single most important unsupported or weakly supported assumption identified.',
        '3. nextValidationPriority: The single most important thing the founder should test or research next.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strongestPart: { type: Type.STRING },
              biggestAssumption: { type: Type.STRING },
              nextValidationPriority: { type: Type.STRING },
            },
            required: [
              'strongestPart',
              'biggestAssumption',
              'nextValidationPriority',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        strongestPart?: string;
        biggestAssumption?: string;
        nextValidationPriority?: string;
      };

      if (
        !parsed.strongestPart?.trim() ||
        !parsed.biggestAssumption?.trim() ||
        !parsed.nextValidationPriority?.trim()
      ) {
        res.status(502).json({
          error: 'Gemini returned an incomplete strategy review. Please try again.',
        });
        return;
      }

      res.json({
        strongestPart: parsed.strongestPart.trim(),
        biggestAssumption: parsed.biggestAssumption.trim(),
        nextValidationPriority: parsed.nextValidationPriority.trim(),
      });
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`NEXUS Venture Studio server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
