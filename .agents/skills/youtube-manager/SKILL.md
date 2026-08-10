---
name: youtube-manager
description: >-
  Agente especializado em gerenciar e manipular tudo relacionado ao YouTube no SignalCatcherFrontend.
  Use esta skill quando o usuário pedir para modificar componentes React do YouTube, ajustar a API
  Express local, atualizar types TypeScript, ou fazer qualquer mudança na UI de captura de vídeos,
  canais monitorados, dashboard de criadores ou analytics de seguidores.
---

# 🎬 YouTube Manager (Frontend) — Skill de Gerenciamento YouTube

Esta skill fornece conhecimento especializado para manipular os componentes e serviços YouTube
do frontend SignalCatcher (React + Vite + Express).

---

## Arquivos-Chave

| Arquivo | Função |
|---------|--------|
| `src/components/apps/SignalCatcherApp.tsx` | Módulo principal YouTube (UI completa) |
| `src/App.tsx` | Shell: polling 5s, busca debounced, filtros, paginação |
| `server.ts` | API Express local (rotas mock `/api/youtube/*`) |
| `src/types.ts` | Interfaces TypeScript (CapturedVideo, ContentSource, etc.) |
| `src/components/apps/CreatorDashboardsApp.tsx` | Dashboard de métricas de criadores |
| `src/components/apps/FollowerAnalyticsApp.tsx` | Analytics multi-plataforma |
| `src/locales/en.ts` | Traduções inglês |
| `src/locales/pt.ts` | Traduções português |

## Tech Stack

- React 19 + TypeScript 5.8 + Vite 6
- TailwindCSS v4 + shadcn/ui + Radix UI
- Framer Motion (animações)
- Recharts + D3 (gráficos)
- Express (server.ts)
- Lucide React (ícones)

## Rotas API Express (server.ts)

| Método | Rota | Ação |
|--------|------|------|
| POST | /api/youtube/sources | Registrar canal |
| GET | /api/youtube/monitored_channels | Listar canais monitorados |
| GET | /api/youtube/channels | Listar canais salvos |
| POST | /api/youtube/content | Ingerir vídeo |
| POST | /api/youtube/playlist | Ingerir playlist |
| GET | /api/youtube/content | Listar vídeos (paginado) |
| GET | /api/youtube/content/:id/tracking | Histórico pipeline |
| POST | /api/youtube/content/retry-errors | Retry global |
| POST | /api/youtube/content/:id/retry | Retry específico |
| DELETE | /api/youtube/content/:id | Deletar vídeo |

## SignalCatcherApp.tsx — Sub-módulos

- **Captures**: Grid de vídeos + modal de detalhes + VideoTrackingViewer
- **Saved Channels**: Canais salvos com metadados
- **Monitored Sources**: Canais em monitoramento ativo
- **Background Jobs**: Status dos jobs agendados

## Procedimento para Modificações

1. **Novo campo na UI**: Atualizar `src/types.ts` → Atualizar componente → Atualizar `server.ts` mock
2. **Novo endpoint**: Adicionar rota em `server.ts` → Consumir no componente
3. **Novo componente**: Criar em `src/components/apps/` → Registrar em `App.tsx`
4. **Tradução**: Adicionar chaves em `src/locales/en.ts` e `src/locales/pt.ts`

## Regras

1. **TypeScript estrito** — sem `any`
2. **TailwindCSS v4** — classes utilitárias, padrão shadcn/ui
3. **Types sincronizados** com DTOs do backend
4. **Responda em português brasileiro**
