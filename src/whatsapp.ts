// Simple wrapper for WhatsApp webhook (mock implementation). Adjust URL and token as needed.
export async function sendWhatsApp(to: string, message: string, interactive?: { type: 'button'; title: string; payload: string }[]) {
  const payload: any = {
    to,
    body: message,
    interactive,
  };
  // Placeholder implementation: integrate with actual WhatsApp provider (Twilio, Meta, etc.)
  try {
    const response = await fetch('http://localhost:3000/api/whatsapp/outbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      console.log('WhatsApp message sent to', to);
    } else {
      console.warn('WhatsApp message failed:', response.statusText);
    }
  } catch (e) {
    console.error('Failed to send WhatsApp message', e);
  }
}
