export function formatWhatsAppMessage(text: string): string {
  return encodeURIComponent(text);
}

export function getWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${formatWhatsAppMessage(text)}`;
}
