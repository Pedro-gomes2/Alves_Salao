<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/68e89e45-9c12-4162-a8b4-952afc146dcb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Acesso

- **Cliente** (agendamento público): `/agendar` (ou raiz `/`).
- **Equipe e administração**: `/admin`.

**Credenciais iniciais (seed):**
- Administrador: usuário `admin`, senha `alves2026`.
- Cada profissional do seed tem o primeiro nome em minúsculas como usuário (ex.: `aline`, `gabriela`, `juliana`, `karina`) e senha inicial `alves2026`.

**Criar/editar contas:** o administrador entra em `/admin`, abre a aba **Equipe** e edita cada profissional para definir `Usuário`, `Nova senha` e `Permissão`. Botão de chave (KeyRound) no card da profissional reseta a senha rapidamente. Quando uma profissional não tem `Usuário` cadastrado, o card mostra o selo *Sem login*.

**Permissões:** apenas usuários com `roleType = 'admin'` veem as abas Equipe, Financeiro, Relatório e Gestão de Serviços; profissionais veem somente a própria agenda.
