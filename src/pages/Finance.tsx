import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  date: string;
  method: string;
  status: 'pending' | 'completed';
}

const Finance: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const res = await axios.get<Payment[]>('/api/payments');
      setPayments(res.data);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (paymentId: string) => {
    try {
      await axios.post('/api/payments/confirm', { paymentId });
      // refresh list
      await fetchPayments();
    } catch (err) {
      console.error('Failed to confirm payment', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Carregando pagamentos...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Financeiro</h1>
      {payments.length === 0 ? (
        <div className="text-gray-600">Nenhum pagamento encontrado.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Agendamento</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Valor</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Data</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Método</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="px-4 py-2 text-sm text-gray-800">{p.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{p.bookingId}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">R$ {p.amount.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{p.date}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{p.method}</td>
                  <td className="px-4 py-2 text-sm text-gray-800 capitalize">{p.status}</td>
                  <td className="px-4 py-2 text-sm">
                    {p.status === 'pending' && (
                      <button
                        onClick={() => confirmPayment(p.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Finance;
