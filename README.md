# 💇‍♀️ ALVES ESTÉTICA - Portal de Agendamento

**Sistema de agendamento online e gerenciamento de salão de estética.**

---

## 📋 Sobre o Projeto

ALVES ESTÉTICA é uma plataforma web moderna para gerenciar agendamentos de procedimentos estéticos. O sistema permite que clientes agendem serviços online e que profissionais gerenciem seus atendimentos em tempo real.

### Funcionalidades Principais

✅ **Para Clientes:**
- Agendamento online de serviços
- Seleção de profissional e horário
- Confirmação via WhatsApp
- Visualização de perfis de especialistas

✅ **Para Profissionais:**
- Dashboard de atendimentos
- Gerenciamento de agenda pessoal
- Histórico de atendimentos

✅ **Para Administrador:**
- Gerenciamento completo de especialistas
- Controle de serviços e preços
- Visualização de agendamentos
- Relatórios financeiros
- Gerenciamento de clientes

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Interface de usuário
- **TypeScript** - Type-safety
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones

### Backend
- **Node.js** - Runtime
- **Vercel Serverless Functions** - API
- **Supabase** - Banco de dados PostgreSQL

### Autenticação
- **JWT (JSON Web Tokens)** - Autenticação segura
- **Crypto (Node.js)** - Geração de tokens

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn
- Credenciais do Supabase (opcional para desenvolvimento)

### Instalação

```bash
# Clonar repositório
git clone https://github.com/Pedro-gomes2/Alves_Salao.git
cd Alves_Salao

# Instalar dependências
npm install

# Criar arquivo .env (copiar do .env.example)
cp .env.example .env

# Preencher variáveis de ambiente
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# JWT_SECRET=...
```

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abre em http://localhost:5173
```

### Build para Produção

```bash
# Build da aplicação
npm run build

# Inicia servidor Express para testar build localmente
npm run start
```

---

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── BookingFlow.tsx      # Fluxo de agendamento do cliente
│   ├── LoginScreen.tsx      # Tela de login
│   ├── PortalDashboard.tsx  # Painel administrativo
│   └── ...
├── pages/              # Páginas de aplicação
├── types.ts            # Definições de tipos TypeScript
├── App.tsx             # Componente raiz
├── main.tsx            # Entry point
└── utils/              # Funções utilitárias
    └── timeSlots.ts        # Lógica de horários disponíveis

api/
└── [...].js            # Handler da API Vercel Serverless

public/
└── ...                 # Arquivos estáticos
```

---

## 🔐 Segurança

- ✅ Autenticação JWT com verificação de assinatura
- ✅ Senhas com hash (suporte para bcrypt)
- ✅ Tokens com expiração de 12 horas
- ✅ CORS configurado
- ✅ Validação de entrada de dados
- ✅ Suporte para Supabase com fallback em memória

---


## 🗄️ Banco de Dados

### Tabelas Principais
- `specialists` - Profissionais/admins
- `services` - Serviços oferecidos
- `bookings` - Agendamentos
- `transactions` - Registros financeiros
- `clients` - Dados de clientes

### Status do Banco
O sistema tenta conectar ao Supabase automaticamente. Se indisponível, usa um banco de dados em memória (não persistente).

Verificar status: `/api/db-status`

---

## 🔄 Fluxo de Agendamento

```
1. Cliente seleciona especialista
   ↓
2. Escolhe serviço(s)
   ↓
3. Seleciona data e horário
   ↓
4. Preenche dados pessoais
   ↓
5. Confirmação via WhatsApp
   ↓
6. Admin confirma atendimento
   ↓
7. Registra pagamento no financeiro
```

---

## 📊 API Endpoints

### Autenticação
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Dados do usuário autenticado

### Dados
- `GET /api/specialists` - Listar profissionais
- `GET /api/services` - Listar serviços
- `GET /api/bookings` - Listar agendamentos
- `PATCH /api/bookings/:id/status` - Atualizar status
- `GET /api/transactions` - Listar transações

---



## 🤝 Contribuindo

1. Crie uma branch (`git checkout -b feature/sua-feature`)
2. Commit suas mudanças (`git commit -m 'adiciona nova feature'`)
3. Push para a branch (`git push origin feature/sua-feature`)
4. Abra um Pull Request

---

## 📝 Licença

© 2026 ALVES ESTÉTICA - Todos os direitos reservados.

---



**Desenvolvido  por joao Pedro com ❤️ para ALVES ESTÉTICA**
