import { GoogleGenerativeAI } from '@google/generative-ai'

export async function geminiJsonChat(params: {
  apiKey: string
  model: string
  systemPrompt: string
  userContent: string
  timeoutMs: number
}): Promise<string> {
  const genAI = new GoogleGenerativeAI(params.apiKey)
  const model = genAI.getGenerativeModel({
    model: params.model,
    systemInstruction: params.systemPrompt,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  })

  const result = await Promise.race([
    model.generateContent(params.userContent),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Gemini request timed out after ${params.timeoutMs}ms`))
      }, params.timeoutMs)
    }),
  ])

  const text = result.response.text()
  if (text === '') {
    throw new Error('Empty response from Gemini')
  }
  return text
}
