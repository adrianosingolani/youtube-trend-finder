import { completeChatWithRouting } from '../../llm/completeChat.js'
import type { LlmCompletionPort } from '../../application/ports/llm-completion.port.js'

export class LlmCompletionAdapter implements LlmCompletionPort {
  completeChatWithRouting: LlmCompletionPort['completeChatWithRouting'] =
    completeChatWithRouting
}
