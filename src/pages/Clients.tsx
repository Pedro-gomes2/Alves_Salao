import React, { useEffect, useState } from 'react';
import { Client, AuthUser } from '../types';
import { X, Edit, User, Phone, Check } from 'lucide-react';

interface ClientsProps {
  authToken: string;
  currentUser: AuthUser;
  onRefresh: () => void;
}

export default function Clients({ authToken, currentUser, onRefresh }: ClientsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; phone: string }>({ name: '', phone: '' });

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  });

  const fetchClients = async () => {
    const res = await fetch('/api/clients', { headers: authHeaders() });
    if (res.ok) setClients(await res.json());
  };

  useEffect(() => {
    if (currentUser.roleType === 'admin') fetchClients();
  }, []);

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({ name: client.name, phone: client.phone });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', phone: '' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este cliente?')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchClients();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form } as any;
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/clients/${editingId}` : '/api/clients';
    await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    cancelEdit();
    fetchClients();
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-brand-primary-light/30">
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Clientes (Admin)</h2>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          className="flex-1 px-3 py-2 border rounded"
          placeholder="Nome"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="flex-1 px-3 py-2 border rounded"
          placeholder="Telefone"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-brand-primary text-white rounded-full hover:bg-brand-primary-dark"
        >
          {editingId ? 'Salvar' : 'Adicionar'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full"
          >Cancelar</button>
        )}
      </form>

      <table className="w-full table-auto">
        <thead className="bg-brand-primary-light/20">
          <tr>
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Telefone</th>
            <th className="px-4 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className="border-b">
              <td className="px-4 py-2">{c.name}</td>
              <td className="px-4 py-2">{c.phone}</td>
              <td className="px-4 py-2 flex justify-center gap-2">
                <button onClick={() => startEdit(c)} className="p-1 text-brand-primary hover:text-brand-primary-dark"><Edit size={16} /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1 text-red-600 hover:text-red-800"><X size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
