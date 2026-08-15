import { conversations } from "./inbox-fixtures"

export function createConversationScale(count = 500) {
  return Array.from({ length: count }, (_, index) => {
    const source = conversations[index % conversations.length]!
    return {
      ...structuredClone(source),
      id: `${source.id}-scale-${index}`,
      version: 1,
    }
  })
}
