import axios from 'axios';

// Simple wrapper for WhatsApp webhook (mock implementation). Adjust URL and token as needed.
export async function sendWhatsApp(to: string, message: string, interactive?: { type: 'button'; title: string; payload: string }[]) {
  const payload: any = {
    to,
    body: message,
    interactive,
  };
  // Assuming a local webhook at /api/whatsapp/outbound (you can replace with actual provider endpoint)
  try {
    await axios.post('http://localhost:3000/api/whatsapp/outbound', payload);
    console.log('WhatsApp message sent to', to);
  } catch (e) {
    console.error('Failed to send WhatsApp message', e);
  }
}
