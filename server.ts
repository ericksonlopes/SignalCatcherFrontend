import express from "express";
import {timingSafeEqual} from "node:crypto";
import path from "path";
import {createServer as createViteServer} from "vite";
import {demographMock} from './server/demographMock';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  // Match the backend's administrative access contract; keep the key server-side.
  app.use((req, res, next) => {
    const administrative = req.path === '/metrics' || (req.path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method));
    if (!administrative) return next();
    const expected = process.env.ADMIN_API_KEY;
    if (!expected) return res.status(503).json({detail: 'Administrative access is not configured.'});
    const supplied = Buffer.from(req.header('X-API-Key') || '');
    const expectedBytes = Buffer.from(expected);
    if (supplied.length !== expectedBytes.length || !timingSafeEqual(supplied, expectedBytes)) {
      return res.status(401).json({detail: 'Invalid administrative API key.'});
    }
    next();
  });

  app.use('/api/demograph', demographMock());

  // In-memory data store for YouTube sources and content
  const youtubeSources: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    channelId: string;
    avatar: string;
    subscriberCount: number;
    lastCaptured: string;
    status: string;
    totalCaptured: number;
  }> = [];

  const youtubeContents: Array<{
    id: string;
    sourceId: string;
    sourceName: string;
    sourceAvatar: string;
    title: string;
    videoUrl: string;
    thumbnail: string;
    publishedAt: string;
    duration: string;
    views: number;
    likes: number;
    commentsCount: number;
    status: string;
    postgresRecordId: string;
    tags: string[];
    summary: string;
    sentimentScore: number;
    is_diarized?: boolean;
    diarization_status?: string | null;
    deletion_requested?: boolean;
  }> = [];


  app.get('/status', (_req, res) => res.json({status: 'online'}));
  app.get('/ready', (_req, res) => res.json({status: 'ready', checks: {database: true, worker: true}}));
  app.get('/metrics', (_req, res) => res.json({
    content_counts: {}, oldest_queued_age_seconds: 0, expired_reservations: 0,
    deletions_pending: youtubeContents.filter(item => item.deletion_requested).length,
    retries_exhausted: 0, deletions_exhausted: 0, jobs: [],
  }));
  const mockJobs = new Set(['youtube_monitor_channels', 'youtube_extract_and_download',
    'youtube_extract_metadata', 'youtube_download_videos', 'youtube_process_errors',
    'youtube_promote_scheduled', 'youtube_delete_contents']);
  app.post('/api/youtube/scheduler/jobs/:jobId/run', (req, res) => {
    if (!mockJobs.has(req.params.jobId)) return res.status(404).json({detail: 'Job not found.'});
    return res.status(202).json({message: 'Mock request queued.', job_id: req.params.jobId});
  });
  app.delete('/api/youtube/content/:externalId', (req, res) => {
    const item = youtubeContents.find(video => video.id === req.params.externalId || video.postgresRecordId === req.params.externalId);
    if (!item) return res.status(404).json({detail: 'Content not found.'});
    item.deletion_requested = true;
    return res.status(202).json({message: 'Mock deletion queued.', deletion_requested: true});
  });

  // API Routes

  /**
   * POST /api/youtube/sources
   * Registers a new YouTube Channel to be monitored.
   * Request body: { "name": "string", "url": "string" }
   */
  app.post("/api/youtube/sources", (req, res) => {
    const { name, url } = req.body || {};

    if (!url) {
      return res.status(400).json({
        error: "Bad Request",
        message: "O campo 'url' é obrigatório."
      });
    }

    const channelName = name || (url.includes("@") ? `@${url.split("@")[1]}` : "Canal YouTube Ingerido");

    const newSource = {
      id: `src-${Date.now()}`,
      name: String(channelName),
      url: String(url),
      type: "youtube",
      channelId: `UC_${Math.random().toString(36).substring(2, 9)}`,
      avatar: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80",
      subscriberCount: Math.floor(Math.random() * 50000 + 5000),
      lastCaptured: new Date().toISOString(),
      status: "active",
      totalCaptured: 0
    };

    youtubeSources.unshift(newSource);

    return res.status(201).json({
      success: true,
      message: "YouTube channel source successfully registered for monitoring.",
      data: newSource
    });
  });

  /**
   * GET /api/youtube/monitored_channels
   * Lists monitored YouTube sources.
   */
  app.get("/api/youtube/monitored_channels", (_req, res) => {
    return res.json({
      success: true,
      data: youtubeSources
    });
  });

  /**
   * GET /api/youtube/channels
   * Lists saved YouTube channels.
   */
  app.get("/api/youtube/channels", (_req, res) => {
    return res.json({
      success: true,
      data: youtubeSources.map(s => ({ ...s, id: s.id + "-saved" })) // Mocking saved channels
    });
  });

  /**
   * POST /api/youtube/content
   * Adds a new content from a given YouTube link. Extracts video metadata.
   * Request body: { "url": "string" }
   */
  app.post("/api/youtube/content", (req, res) => {
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({
        error: "Bad Request",
        message: "O campo 'url' é obrigatório."
      });
    }

    const isPlaylist = String(url).includes("playlist") || String(url).includes("list=");
    const randomPgId = `pg_vid_${Math.floor(Math.random() * 8999 + 1000)}`;

    const newContent = {
      id: `vid-${Date.now()}`,
      sourceId: youtubeSources[0]?.id || "src-1",
      sourceName: isPlaylist ? "YouTube Playlist Ingestion Engine" : "YouTube Direct Ingestion",
      sourceAvatar: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80",
      title: isPlaylist 
        ? "Playlist Extraída: Série Completa e Tutoriais YouTube"
        : "Vídeo Ingerido: Análise do Conteúdo e Metadados YouTube",
      videoUrl: String(url),
      thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
      publishedAt: new Date().toISOString(),
      duration: "12:45",
      views: Math.floor(Math.random() * 5000 + 500),
      likes: Math.floor(Math.random() * 400 + 50),
      commentsCount: Math.floor(Math.random() * 50 + 5),
      status: "ingested",
      postgresRecordId: randomPgId,
      tags: ["YouTube", isPlaylist ? "Playlist" : "Video", "API"],
      summary: "Conteúdo extraído do link fornecido, processado com IA e persistido no banco PostgreSQL.",
      sentimentScore: 0.94
    };

    youtubeContents.unshift(newContent);

    return res.status(201).json({
      success: true,
      message: "YouTube content successfully extracted and ingested.",
      data: newContent
    });
  });

  /**
   * POST /api/youtube/playlist
   * Adds new content from a given YouTube playlist. It extracts metadata from all videos.
   * Request body: { "url": "string", "save_in_playlist_folder": boolean }
   */
  app.post("/api/youtube/playlist", (req, res) => {
    const { url, save_in_playlist_folder = false } = req.body || {};

    if (!url) {
      return res.status(400).json({
        error: "Bad Request",
        message: "O campo 'url' é obrigatório."
      });
    }

    const playlistId = `pl_${Math.floor(Math.random() * 8999 + 1000)}`;
    const items = [
      {
        id: `vid-${Date.now()}-1`,
        sourceId: youtubeSources[0]?.id || "src-1",
        sourceName: "YouTube Playlist Ingestion",
        sourceAvatar: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80",
        title: "Playlist Extraída - Módulo 1: Fundamentos & Arquitetura",
        videoUrl: String(url),
        thumbnail: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&auto=format&fit=crop&q=80",
        publishedAt: new Date().toISOString(),
        duration: "18:30",
        views: 4200,
        likes: 510,
        commentsCount: 42,
        status: "ingested",
        postgresRecordId: `pg_${playlistId}_1`,
        tags: ["YouTube", "Playlist", save_in_playlist_folder ? "FolderSaved" : "DirectList"],
        summary: "Vídeo 1 da playlist extraída automaticamente.",
        sentimentScore: 0.96
      },
      {
        id: `vid-${Date.now()}-2`,
        sourceId: youtubeSources[0]?.id || "src-1",
        sourceName: "YouTube Playlist Ingestion",
        sourceAvatar: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80",
        title: "Playlist Extraída - Módulo 2: Processamento e API FastAPI",
        videoUrl: String(url),
        thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
        publishedAt: new Date().toISOString(),
        duration: "24:10",
        views: 3800,
        likes: 410,
        commentsCount: 28,
        status: "ingested",
        postgresRecordId: `pg_${playlistId}_2`,
        tags: ["YouTube", "Playlist", save_in_playlist_folder ? "FolderSaved" : "DirectList"],
        summary: "Vídeo 2 da playlist extraída automaticamente.",
        sentimentScore: 0.92
      }
    ];

    youtubeContents.unshift(...items);

    return res.status(201).json({
      success: true,
      message: "YouTube playlist content successfully extracted and ingested.",
      save_in_playlist_folder: Boolean(save_in_playlist_folder),
      data: items
    });
  });

  /**
   * GET /api/youtube/content
   * Lists ingested YouTube contents.
   */
  app.get("/api/youtube/content", (req, res) => {
    let items = youtubeContents;
    const channelQuery = (req.query.channel as string || "").toLowerCase();
    if (channelQuery) {
      items = items.filter(i => (i.sourceName || "").toLowerCase().includes(channelQuery));
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const step = String(req.query.step || '');
    const search = String(req.query.search || '').toLowerCase();
    if (step) items = items.filter(item => item.status === step);
    if (search) items = items.filter(item => item.title.toLowerCase().includes(search));
    const total = items.length;
    const pageItems = items.slice((page - 1) * limit, page * limit).map(item => ({
      id: item.id, title: item.title, url: item.videoUrl, channel_name: item.sourceName,
      step: item.status, thumbnail: item.thumbnail, duration: 0, published_at: item.publishedAt,
      tags: item.tags, is_diarized: item.is_diarized ?? false,
      diarization_status: item.diarization_status ?? null,
      deletion_requested: item.deletion_requested ?? false,
      attempt_count: 0, next_retry_at: null, error_info: null,
    }));
    return res.json({items: pageItems, data: items, total, page, limit, total_pages: Math.ceil(total / limit)});
  });

  /**
   * GET /api/diarization/list
   * Returns a paginated list of diarizations.
   */
  const mockDiarizations: Array<{
    id: string;
    step: string;
    progress_percent?: number | null;
    queue_priority?: number;
    created_at: string;
    entity_id: string;
    entity_type: string;
    title: string;
    channelName: string;
    thumbnail: string;
    duration: string;
    result_json: any;
  }> = [];

  function prioritizeMockDiarization(id: string) {
    const video = youtubeContents.find(v => v.id === id || v.postgresRecordId === id || `diar-${v.id}` === id);
    let task = mockDiarizations.find(d => d.id === id || d.entity_id === id);
    if (!task && video) {
      task = { id: `diar-${video.id}`, step: 'PENDING', queue_priority: 0,
        created_at: new Date().toISOString(), entity_id: video.postgresRecordId || video.id,
        entity_type: 'YOUTUBE', title: video.title, channelName: video.sourceName,
        thumbnail: video.thumbnail, duration: video.duration, result_json: null };
      mockDiarizations.unshift(task);
    }
    if (!task) return undefined;
    const active = ['STARTED', 'PROCESSING', 'TRANSCRIPTION', 'ALIGNMENT', 'DIARIZATION', 'DIARIZED'];
    for (const item of mockDiarizations) {
      item.queue_priority = 0;
      if (active.includes(item.step)) {
        item.step = 'PENDING'; item.progress_percent = null;
      }
    }
    for (const item of youtubeContents) {
      if (active.includes(item.diarization_status || '')) item.diarization_status = 'PENDING';
    }
    task.step = 'PENDING'; task.queue_priority = 1; task.progress_percent = null; task.result_json = null;
    if (video) { video.diarization_status = 'PENDING'; video.is_diarized = false; }
    return task;
  }

  app.post('/api/diarization/:id/start-now', (req, res) => {
    const task = prioritizeMockDiarization(req.params.id);
    if (!task) return res.status(404).json({ detail: 'Diarization task not found' });
    return res.json({ task_id: task.id, step: task.step, queue_priority: task.queue_priority });
  });

  app.get(["/api/diarization/list", "/api/diarization"], (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const stepFilter = (req.query.step as string || "").toUpperCase();
    const searchQuery = (req.query.search as string || "").toLowerCase();

    let items = [...mockDiarizations];

    // Combine with any dynamically triggered diarizations from youtubeContents
    youtubeContents.forEach(v => {
      if (v.diarization_status && !items.some(d => d.entity_id === v.id || d.entity_id === v.postgresRecordId)) {
        items.unshift({
          id: `diar-${v.id}`,
          step: v.diarization_status,
          progress_percent: null,
          created_at: new Date().toISOString(),
          entity_id: v.postgresRecordId || v.id,
          entity_type: "YOUTUBE",
          title: v.title,
          channelName: v.sourceName,
          thumbnail: v.thumbnail,
          duration: v.duration,
          result_json: null
        });
      }
    });

    if (stepFilter && stepFilter !== "ALL") {
      if (stepFilter === "PENDING") {
        items = items.filter(d => (d.step || "").toUpperCase() === "PENDING");
      } else if (stepFilter === "PROCESSING") {
        const processingSteps = ["STARTED", "TRANSCRIPTION", "ALIGNMENT", "DIARIZATION", "DIARIZED", "PROCESSING"];
        items = items.filter(d => processingSteps.includes((d.step || "").toUpperCase()));
      } else if (stepFilter === "ERROR") {
        items = items.filter(d => (d.step || "").toUpperCase() === "ERROR");
      } else if (stepFilter === "COMPLETED") {
        items = items.filter(d => (d.step || "").toUpperCase() === "COMPLETED");
      } else {
        items = items.filter(d => (d.step || "").toUpperCase() === stepFilter);
      }
    }

    if (searchQuery) {
      items = items.filter(d =>
        (d.title || "").toLowerCase().includes(searchQuery) ||
        (d.channelName || "").toLowerCase().includes(searchQuery)
      );
    }

    const processingSteps = new Set(['STARTED', 'PROCESSING', 'TRANSCRIPTION', 'ALIGNMENT', 'DIARIZATION', 'DIARIZED']);
    items.sort((a, b) => {
      if (!stepFilter || stepFilter === 'ALL') {
        const activeOrder = Number(processingSteps.has(b.step.toUpperCase())) - Number(processingSteps.has(a.step.toUpperCase()));
        if (activeOrder) return activeOrder;
      }
      return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
    });
    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    const statusCounts: Record<string, number> = {};
    for (const d of mockDiarizations) {
      statusCounts[d.step] = (statusCounts[d.step] || 0) + 1;
    }

    return res.json({
      items: paginatedItems,
      diarizations: paginatedItems,
      total,
      page,
      limit,
      total_pages: totalPages,
      status_counts: statusCounts,
      total_status_count: total
    });
  });

  /**
   * POST /api/diarization/youtube/:id
   * Triggers audio diarization for a YouTube video.
   */
  app.post("/api/diarization/youtube/:id", (req, res) => {
    const { id } = req.params;
    const { language } = req.body || {};

    const video = youtubeContents.find(v => v.id === id || v.postgresRecordId === id);
    if (video) {
      video.is_diarized = false;
      video.diarization_status = 'PENDING';
    }

    const prioritized = req.body?.start_now ? prioritizeMockDiarization(id) : undefined;
    return res.json({
      success: true,
      task_id: prioritized?.id || `task-diarize-${Date.now()}`,
      message: `Diarização iniciada para o vídeo ${id} (Idioma: ${language || 'Auto'})`
    });
  });

  /**
   * POST /api/diarization/:id/reprocess & /api/diarization/:id/retry
   * Resets a diarization task back to PENDING step for reprocessing.
   */
  app.post(["/api/diarization/:id/reprocess", "/api/diarization/:id/retry"], (req, res) => {
    const { id } = req.params;

    const diar = mockDiarizations.find(d => d.id === id || d.entity_id === id);
    if (diar) {
      diar.step = "PENDING";
      diar.progress_percent = null;
      diar.result_json = null;
    }

    const video = youtubeContents.find(v => v.id === id || v.postgresRecordId === id || `diar-${v.id}` === id);
    if (video) {
      video.is_diarized = false;
      video.diarization_status = "PENDING";
    }

    return res.json({
      success: true,
      message: `Diarização ${id} enviada para reprocessamento (Status: Pendente)`,
      task_id: diar?.id || id,
      step: "PENDING"
    });
  });

  /**
   * POST /api/diarization/:id/cancel
   * Cancels a diarization task that is currently in progress.
   */
  app.post("/api/diarization/:id/cancel", (req, res) => {
    const { id } = req.params;
    const cancellableSteps = new Set(["PENDING", "STARTED", "TRANSCRIPTION", "ALIGNMENT", "DIARIZATION"]);

    const diar = mockDiarizations.find(d => d.id === id || d.entity_id === id);
    const video = youtubeContents.find(v => v.id === id || v.postgresRecordId === id || `diar-${v.id}` === id);

    if (!diar && !video) {
      return res.status(404).json({ detail: "Diarization task not found" });
    }

    if (diar && !cancellableSteps.has(diar.step)) {
      return res.status(409).json({
        detail: `Diarization task cannot be cancelled (current step: ${diar.step})`
      });
    }

    if (diar) {
      diar.step = "CANCELLED";
      diar.progress_percent = null;
    }
    if (video) {
      video.is_diarized = false;
      video.diarization_status = "CANCELLED";
    }

    return res.json({
      success: true,
      message: `Diarização ${id} cancelada com sucesso`,
      task_id: diar?.id || id,
      entity_id: diar?.entity_id || id,
      step: "CANCELLED"
    });
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
