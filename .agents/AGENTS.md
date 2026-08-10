# SignalCatcherFrontend Agent Rules

## Projeto

Este é o **SignalCatcherFrontend** — interface web para o sistema SignalCatcher, construído com:

- **React 19** + **TypeScript 5.8** (framework + tipagem)
- **Vite 6** (bundler)
- **TailwindCSS v4** (estilização)
- **shadcn/ui** + **Radix UI** (componentes)
- **Framer Motion** (animações)
- **Recharts** + **D3** (gráficos)
- **Express** (server.ts — API local de desenvolvimento)
- **Lucide React** (ícones)

## Estrutura

```
src/
├── main.tsx                    → Entry point React
├── App.tsx                     → Shell principal (tabs, polling, busca, filtros)
├── types.ts                    → Interfaces TypeScript compartilhadas
├── components/apps/            → Módulos da aplicação
│   ├── SignalCatcherApp.tsx     → Módulo principal YouTube
│   ├── CreatorDashboardsApp.tsx → Dashboard de criadores
│   └── FollowerAnalyticsApp.tsx → Analytics de seguidores
├── data/initialData.ts         → Dados mock iniciais
└── locales/                    → Internacionalização (en, pt)
```

## Regras de Desenvolvimento

1. **TypeScript estrito**: Sempre tipar props, estados e retornos. Sem `any`.
2. **TailwindCSS v4**: Use classes utilitárias do Tailwind. Mantenha o padrão shadcn/ui.
3. **Componentes**: Mantenha componentes focados e reutilizáveis.
4. **server.ts**: Ao adicionar endpoints na API real (backend), adicione o mock correspondente no `server.ts`.
5. **Types sincronizados**: Mantenha `src/types.ts` sincronizado com os DTOs do backend.
6. **i18n**: Ao adicionar textos visíveis ao usuário, adicione nas locales (en e pt).
7. **Linguagem**: Responda em português brasileiro. Código e comentários técnicos em inglês.
