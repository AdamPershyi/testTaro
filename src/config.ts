import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  apiSecret: requireEnv('API_SECRET', 'dev-secret-change-me'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
  openai: {
    apiKey: optionalEnv('OPENAI_API_KEY'),
    chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
    ttsModel: process.env.OPENAI_TTS_MODEL ?? 'tts-1',
    ttsVoice: (process.env.OPENAI_TTS_VOICE ?? 'nova') as
      | 'alloy'
      | 'echo'
      | 'fable'
      | 'onyx'
      | 'nova'
      | 'shimmer',
  },
  allowReversed: (process.env.ALLOW_REVERSED ?? 'true').toLowerCase() === 'true',
  audioTtlMs: 30 * 60 * 1000,
  maxQuestionLength: 300,
  maxQueueSize: 20,
} as const;

export function getPublicBaseUrl(reqHost?: string): string {
  if (config.publicBaseUrl) {
    return config.publicBaseUrl.replace(/\/$/, '');
  }
  if (reqHost) {
    const protocol = reqHost.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${reqHost}`;
  }
  return `http://localhost:${config.port}`;
}
