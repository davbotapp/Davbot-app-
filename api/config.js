// DAVBOT AI — Backend configuration
// IMPORTANT: keep this file server-side only.
// Replace the placeholders with fresh keys. Never use keys previously exposed in chat.

module.exports = {
  GROQ_API_KEY: "REMPLACE_PAR_TA_NOUVELLE_CLE_GROQ",
  GROQ_API_URL: "https://api.groq.com/openai/v1/chat/completions",
  GROQ_MODEL: "qwen/qwen3.8-27b",

  POLLINATIONS_API_KEY: "REMPLACE_PAR_TA_NOUVELLE_CLE_POLLINATIONS",
  POLLINATIONS_API_URL: "https://gen.pollinations.ai/v1/images/generations",
  POLLINATIONS_MODEL: "flux",

  MAX_MESSAGE_LENGTH: 16000,
  MAX_HISTORY: 20,
  MAX_IMAGE_BYTES: 8 * 1024 * 1024
};
