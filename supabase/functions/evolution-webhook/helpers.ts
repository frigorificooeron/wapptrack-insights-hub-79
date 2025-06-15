
// Helpers for evolution-webhook: keyword detection, CORS, message extraction, etc.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function detectKeywords(messageContent: string, keywords: string[]): boolean {
  const lowerMessage = messageContent.toLowerCase();
  return keywords.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}

export function getMessageContent(message: any): string {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    'Mensagem recebida'
  );
}

export function getContactName(message: any): string {
  return message.pushName || "Lead Via WhatsApp";
}
