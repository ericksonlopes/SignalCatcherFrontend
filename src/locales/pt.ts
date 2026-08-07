export const pt = {
  // Header Bar
  searchHeaderPlaceholder: "Buscar aplicações, fontes, jobs ou endpoints...",
  notificationsTitle: "Notificações & Eventos do Sistema",
  settingsBtn: "Configurações",
  settingsHeader: "Configurações",
  themeLabel: "Tema da Interface",
  bentoDark: "Bento Dark",
  oledBlack: "OLED Black",
  lightBento: "Light Bento",
  languageLabel: "Idioma / Language",
  executionPrefLabel: "Preferências de Execução",
  liveEventStream: "Live Event Stream",

  // Header & Overview
  appTitle: "YouTube Catcher Engine",
  dbConnected: "PostgreSQL OK",
  appDescription: "Captura automatizada de vídeos do YouTube • Ingestão diária • REST API FastAPI & PostgreSQL",
  
  // Stats
  activeSources: "Fontes Ativas",
  postgresRecords: "PostgreSQL",
  scheduledJobs: "Jobs Agendados",

  // Tabs
  capturedFeeds: "Capturas Ingeridas",
  sources: "Fontes",
  cronJobs: "Cron Jobs",

  // Action Buttons
  capturing: "Capturando...",
  runCaptureNow: "Executar Captura Agora",
  openVideo: "Abrir",
  btnNewIngestionOrSource: "+ Nova Ingestão / Fonte",

  // Ingestion Modal
  modalIngestionTitle: "Ingestão & Cadastro YouTube API",
  modalIngestionSub: "Selecione o endpoint para ingerir vídeos, playlists ou registrar canais do YouTube.",
  tabVideoRoute: "/video",
  tabPlaylistRoute: "/playlist",
  tabCanalRoute: "/canal",
  descVideoRoute: "Ingere e extrai metadados de um único vídeo do YouTube a partir da URL.",
  descPlaylistRoute: "Ingere e extrai todos os vídeos contidos em uma playlist do YouTube.",
  descSourcesRoute: "Cadastra um canal do YouTube para monitoramento contínuo de novas capturas.",
  fieldUrlVideo: "URL do Vídeo",
  fieldUrlPlaylist: "URL da Playlist",
  fieldUrlCanal: "URL do Canal",
  fieldUrlSourcePlaceholder: "https://www.youtube.com/@nome_do_canal",
  fieldUrlVideoPlaceholder: "https://www.youtube.com/watch?v=...",
  fieldUrlPlaylistPlaceholder: "https://www.youtube.com/playlist?list=...",
  fieldSaveInPlaylistFolder: "Salvar em pasta de playlist",
  fieldSaveInPlaylistFolderDesc: "Envia save_in_playlist_folder no corpo da requisição POST",
  btnSubmitEndpoint: "Executar Ingestão",
  ingestingLoader: "Processando e Extraindo Dados...",
  btnSaveAndMonitor: "Salvar e Iniciar Monitoramento",

  // Filters & Search
  filterPlaceholder: "Filtrar capturas por título, canal ou tag...",
  allTags: "Todas Tags",

  // Sources Manager
  monitoredSources: "Fontes de Conteúdo Monitoradas",
  addSource: "Adicionar Fonte",
  registerNewSource: "Registrar Nova Fonte no SignalCatcher",
  channelNameLabel: "Nome do Canal / Feed",
  sourceTypeLabel: "Tipo de Fonte",
  sourceUrlLabel: "URL da Fonte",
  cancel: "Cancelar",
  confirmRegister: "Confirmar Registro",

  // Sources Table
  tableChannelSource: "Canal / Fonte",
  tableType: "Tipo",
  tableSubscribers: "Inscritos",
  tableInterval: "Intervalo Captura",
  tableTotalIngested: "Total Ingerido",
  tableLastCapture: "Última Captura",
  tableStatus: "Status",
  tableAction: "Ação",
  every: "Cada",
  min: "min",
  vids: "vids",

  // Jobs Manager
  jobsManagerTitle: "Gerenciador de Jobs Agendados (FastAPI & PostgreSQL)",
  jobsManagerSubtitle: "Frequência baseada em Cron + BackgroundTasks",
  target: "Target",
  lastRun: "Última Execução",
  nextRun: "Próxima Rodada",
  totalExecutions: "Total Execuções",
  avgTime: "Tempo Médio",
  statusLabel: "Status",
  triggerNow: "Disparar Agora"
};

export type TranslationKeys = keyof typeof pt;
