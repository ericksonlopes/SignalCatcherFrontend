import express from "express";

import { randomBytes, randomInt } from "node:crypto";
import path from "node:path";
import {createServer as createViteServer} from "vite";

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
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
    diarization_progress?: number | null;
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
      channelId: `UC_${randomBytes(4).toString("hex")}`,
      avatar: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80",
      subscriberCount: randomInt(5000, 55000),
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
    const randomPgId = `pg_vid_${randomInt(1000, 10000)}`;

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
      views: randomInt(500, 5500),
      likes: randomInt(50, 450),
      commentsCount: randomInt(5, 55),
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

    const playlistId = `pl_${randomInt(1000, 10000)}`;
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
    const channelQuery = (typeof req.query.channel === "string" ? req.query.channel : "").toLowerCase();
    if (channelQuery) {
      items = items.filter(i => (i.sourceName || "").toLowerCase().includes(channelQuery));
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const step = typeof req.query.step === "string" ? req.query.step : "";
    const search = (typeof req.query.search === "string" ? req.query.search : "").toLowerCase();
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
    const active = new Set(['STARTED', 'PROCESSING', 'TRANSCRIPTION', 'ALIGNMENT', 'DIARIZATION', 'DIARIZED']);
    for (const item of mockDiarizations) {
      item.queue_priority = 0;
      if (active.has(item.step)) {
        item.step = 'PENDING'; item.progress_percent = null;
      }
    }
    for (const item of youtubeContents) {
      if (active.has(item.diarization_status || '')) item.diarization_status = 'PENDING';
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
    const page = Math.max(1, Number.parseInt(typeof req.query.page === "string" ? req.query.page : "", 10) || 1);
    const limit = Math.max(1, Math.min(100, Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : "", 10) || 20));
    const stepFilter = (typeof req.query.step === "string" ? req.query.step : "").toUpperCase();
    const searchQuery = (typeof req.query.search === "string" ? req.query.search : "").toLowerCase();

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
        const processingSteps = new Set(["STARTED", "TRANSCRIPTION", "ALIGNMENT", "DIARIZATION", "DIARIZED", "PROCESSING"]);
        items = items.filter(d => processingSteps.has((d.step || "").toUpperCase()));
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

  // Semantic search mock
  app.post("/api/search/semantic", (req, res) => {
    const { query } = req.body || {};
    const queryStr = (query || "").toLowerCase();

    const mockResults = [
      {
        chunk_id: "mock-chunk-1",
        diarization_id: "mock-diar-1",
        content_id: "mock-video-1",
        video_title: "Tech Podcast #42 - Futuro da Inteligência Artificial",
        channel_title: "Canal Tech IA",
        thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
        text: `[SPEAKER_00]: Quando pensamos em ${queryStr || "inteligência artificial"}, o mais importante é entender o contexto e as aplicações reais em produção.\n[SPEAKER_01]: Com certeza, especialmente quando integramos modelos de linguagem e embeddings locais.`,
        speaker: "SPEAKER_00, SPEAKER_01",
        start_time: 142.0,
        end_time: 185.0,
        formatted_start_time: "02:22",
        formatted_end_time: "03:05",
        similarity_score: 0.884,
        youtube_url_with_timestamp: "https://www.youtube.com/watch?v=mock-video-1&t=142s"
      },
      {
        chunk_id: "mock-chunk-2",
        diarization_id: "mock-diar-2",
        content_id: "mock-video-2",
        video_title: "Arquitetura de Dados em Escala",
        channel_title: "Engenharia de Software",
        thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80",
        text: "[SPEAKER_02]: O banco vetorial com pgvector permite fazer consultas semânticas diretas junto com os dados relacionais de forma performática.",
        speaker: "SPEAKER_02",
        start_time: 310.0,
        end_time: 345.0,
        formatted_start_time: "05:10",
        formatted_end_time: "05:45",
        similarity_score: 0.812,
        youtube_url_with_timestamp: "https://www.youtube.com/watch?v=mock-video-2&t=310s"
      }
    ];

    return res.json(mockResults);
  });

  // Vectorization mock endpoints
  app.post("/api/vectorization/diarization/:id", (req, res) => {
    return res.json({
      diarization_id: req.params.id,
      content_id: "mock-video-1",
      chunks_count: 12,
      indexed: true
    });
  });

  app.get("/api/vectorization/status/:id", (req, res) => {
    return res.json({
      diarization_id: req.params.id,
      content_id: "mock-video-1",
      chunks_count: 12,
      indexed: true
    });
  });

  app.get("/api/vectorization/stats", (_req, res) => {
    return res.json({
      total_chunks: 142,
      total_indexed_diarizations: 18,
      tei_healthy: true
    });
  });

  app.post("/api/vectorization/batch", (_req, res) => {
    return res.json([
      {
        diarization_id: "mock-diar-1",
        content_id: "mock-video-1",
        chunks_count: 12,
        indexed: true
      }
    ]);
  });

  // Voice Recognition mock state and endpoints
  const mockSpeakerProfiles: Array<{
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    samples_count: number;
    created_at: string;
    updated_at: string;
    samples: Array<{
      id: string;
      speaker_id: string;
      source_type: string;
      source_id: string | null;
      speaker_label: string | null;
      start_time: number | null;
      end_time: number | null;
      duration_seconds: number | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>;
  }> = [
    {
      id: "spk-mock-1",
      name: "Carlos Eduardo",
      description: "Host Principal",
      avatar_url: null,
      samples_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      samples: [
        {
          id: "smp-mock-1",
          speaker_id: "spk-mock-1",
          source_type: "DIARIZATION_SEGMENT",
          source_id: "diar-1",
          speaker_label: "SPEAKER_00",
          start_time: 0.0,
          end_time: 24.5,
          duration_seconds: 24.5,
          metadata: {},
          created_at: new Date().toISOString()
        }
      ]
    }
  ];

  app.get("/api/voice-recognition/stats", (_req, res) => {
    const totalSamples = mockSpeakerProfiles.reduce((acc, p) => acc + (p.samples?.length || 0), 0);
    const approvedSamples = mockSpeakerProfiles.reduce(
      (acc, p) => acc + (p.samples?.filter(s => (s as any).status === 'APPROVED')?.length || 0),
      0
    );
    const pendingSamples = totalSamples - approvedSamples;
    return res.json({
      total_profiles: mockSpeakerProfiles.length,
      total_samples: totalSamples,
      pending_samples: pendingSamples,
      approved_samples: approvedSamples,
      embedding_dimension: 256,
      default_similarity_threshold: 0.65,
      worker_healthy: true
    });
  });

  app.get("/api/voice-recognition/profiles", (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.toLowerCase() : "";
    const list = search
      ? mockSpeakerProfiles.filter(p => p.name.toLowerCase().includes(search))
      : mockSpeakerProfiles;
    return res.json(list);
  });

  app.get("/api/voice-recognition/samples/review-queue", (req, res) => {
    const speakerId = typeof req.query.speaker_id === "string" ? req.query.speaker_id : null;
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "PENDING_REVIEW";
    const allSamples: any[] = [];
    for (const p of mockSpeakerProfiles) {
      if (speakerId && p.id !== speakerId) continue;
      for (const s of p.samples || []) {
        if (!status || (s as any).status === status) {
          allSamples.push({ ...s, has_audio: true });
        }
      }
    }
    return res.json(allSamples);
  });

  app.patch("/api/voice-recognition/samples/:sampleId/review", (req, res) => {
    const { sampleId } = req.params;
    const { status, start_time, end_time } = req.body || {};
    for (const p of mockSpeakerProfiles) {
      const s = p.samples?.find(item => item.id === sampleId);
      if (s) {
        (s as any).status = String(status || 'APPROVED').toUpperCase();
        (s as any).reviewed_at = new Date().toISOString();
        if (typeof start_time === 'number' && typeof end_time === 'number') {
          s.start_time = start_time;
          s.end_time = end_time;
          s.duration_seconds = Math.max(0.1, end_time - start_time);
        }
        p.samples_count = p.samples?.filter(item => (item as any).status === 'APPROVED').length || 0;
        return res.json({ ...s, has_audio: true });
      }
    }
    return res.status(404).json({ detail: "Voice sample not found." });
  });

  app.post("/api/voice-recognition/samples/review/bulk", (req, res) => {
    const { sample_ids, status } = req.body || {};
    const ids = Array.isArray(sample_ids) ? sample_ids : [];
    let count = 0;
    for (const p of mockSpeakerProfiles) {
      for (const s of p.samples || []) {
        if (ids.includes(s.id)) {
          (s as any).status = String(status || 'APPROVED').toUpperCase();
          (s as any).reviewed_at = new Date().toISOString();
          count++;
        }
      }
      p.samples_count = p.samples?.filter(item => (item as any).status === 'APPROVED').length || 0;
    }
    return res.json({ processed: count, total: ids.length, status });
  });

  app.get("/api/voice-recognition/samples/:sampleId/audio", (_req, res) => {
    // Generate minimal valid WAV audio file header (silence) for browser playback in mock mode
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x80, 0x3e, 0x00, 0x00, 0x00, 0x7d, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
    ]);
    res.setHeader("Content-Type", "audio/wav");
    return res.send(wavHeader);
  });

  app.get("/api/voice-recognition/preview", (_req, res) => {
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x80, 0x3e, 0x00, 0x00, 0x00, 0x7d, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
    ]);
    res.setHeader("Content-Type", "audio/wav");
    return res.send(wavHeader);
  });

  app.get("/api/voice-recognition/diarization/:id/speakers/:speakerLabel/suggested-clips", (req, res) => {
    const { id, speakerLabel } = req.params;
    const diar = mockDiarizations.find(d => d.id === id || d.entity_id === id);
    const segs = diar?.result_json?.segments || [];
    const speakerSegs = segs.filter((s: any) => s.speaker === speakerLabel || s.original_speaker === speakerLabel);
    const clips = speakerSegs.map((s: any) => ({
      start: s.start,
      end: s.end,
      duration: Math.round((s.end - s.start) * 10) / 10,
      text: s.text || "",
      energy_score: s.end - s.start >= 5.0 ? 3.0 : 1.5,
      has_overlap: false,
      quality_hint: s.end - s.start >= 5.0 ? "good" : "short"
    }));
    return res.json(clips.slice(0, 8));
  });

  app.post("/api/voice-recognition/profiles", (req, res) => {
    const { name, description, avatar_url } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ detail: "Speaker name cannot be empty." });
    }
    const existing = mockSpeakerProfiles.find(
      p => p.name.toLowerCase() === String(name).trim().toLowerCase()
    );
    if (existing) return res.status(201).json(existing);
    const created = {
      id: `spk-${Date.now()}`,
      name: String(name).trim(),
      description: description ? String(description) : null,
      avatar_url: avatar_url ? String(avatar_url) : null,
      samples_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      samples: []
    };
    mockSpeakerProfiles.unshift(created);
    return res.status(201).json(created);
  });

  app.delete("/api/voice-recognition/profiles/:speakerId", (req, res) => {
    const idx = mockSpeakerProfiles.findIndex(p => p.id === req.params.speakerId);
    if (idx === -1) return res.status(404).json({ detail: "Speaker profile not found." });
    mockSpeakerProfiles.splice(idx, 1);
    return res.json({ deleted: true, speaker_id: req.params.speakerId });
  });

  app.post("/api/voice-recognition/enroll/from-diarization", (req, res) => {
    const { diarization_id, speaker_label, speaker_name, apply_to_diarization, start_time, end_time } = req.body || {};
    const cleanName = String(speaker_name || "Locutor").trim();
    let profile = mockSpeakerProfiles.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (!profile) {
      profile = {
        id: `spk-${Date.now()}`,
        name: cleanName,
        description: null,
        avatar_url: null,
        samples_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        samples: []
      };
      mockSpeakerProfiles.unshift(profile);
    }
    const startTimeVal = typeof start_time === "number" ? start_time : 0.0;
    const endTimeVal = typeof end_time === "number" ? end_time : 18.0;
    const durVal = Math.max(0.1, endTimeVal - startTimeVal);
    const sample = {
      id: `smp-${Date.now()}`,
      speaker_id: profile.id,
      source_type: "DIARIZATION_SEGMENT",
      source_id: String(diarization_id || ""),
      speaker_label: String(speaker_label || "SPEAKER_00"),
      start_time: startTimeVal,
      end_time: endTimeVal,
      duration_seconds: durVal,
      metadata: {},
      created_at: new Date().toISOString()
    };
    profile.samples.unshift(sample);
    profile.samples_count += 1;

    const diar = mockDiarizations.find(d => d.id === diarization_id);
    if (apply_to_diarization !== false && diar?.result_json?.segments) {
      for (const seg of diar.result_json.segments) {
        if (seg.speaker === speaker_label) {
          seg.speaker = cleanName;
        }
      }
      diar.result_json.speakers = Array.from(
        new Set(diar.result_json.segments.map((s: { speaker: string }) => s.speaker))
      );
    }

    return res.json({
      speaker_id: profile.id,
      speaker_name: profile.name,
      sample_id: sample.id,
      source_type: "DIARIZATION_SEGMENT",
      source_id: diarization_id,
      speaker_label,
      segments_used: 3,
      speech_duration_seconds: 18.0,
      applied_to_diarization: apply_to_diarization !== false,
      samples_count: profile.samples_count
    });
  });

  app.post("/api/voice-recognition/enroll/video-clip", (req, res) => {
    const { video_id, speaker_name, start_time, end_time, label } = req.body || {};
    const cleanName = String(speaker_name || "Locutor").trim();
    const startSec = Number(start_time || 0);
    const endSec = Number(end_time || startSec + 10);
    const duration = Math.max(1, endSec - startSec);

    let profile = mockSpeakerProfiles.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (!profile) {
      profile = {
        id: `spk-${Date.now()}`,
        name: cleanName,
        description: null,
        avatar_url: null,
        samples_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        samples: []
      };
      mockSpeakerProfiles.unshift(profile);
    }
    const clipLabel = label || `CLIP_${Math.round(startSec)}s_${Math.round(endSec)}s`;
    const sample = {
      id: `smp-${Date.now()}`,
      speaker_id: profile.id,
      source_type: "YOUTUBE_CLIP",
      source_id: String(video_id || ""),
      speaker_label: clipLabel,
      start_time: startSec,
      end_time: endSec,
      duration_seconds: duration,
      metadata: { clip: true, start_time: startSec, end_time: endSec },
      created_at: new Date().toISOString()
    };
    profile.samples.unshift(sample);
    profile.samples_count += 1;

    return res.json({
      speaker_id: profile.id,
      speaker_name: profile.name,
      sample_id: sample.id,
      source_type: "YOUTUBE_CLIP",
      source_id: video_id,
      speaker_label: clipLabel,
      segments_used: 1,
      speech_duration_seconds: duration,
      applied_to_diarization: false,
      samples_count: profile.samples_count
    });
  });

  app.post("/api/voice-recognition/enroll/audio", (req, res) => {
    const { filename, speaker_name } = req.body || {};
    const cleanName = String(speaker_name || "Locutor").trim();
    let profile = mockSpeakerProfiles.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (!profile) {
      profile = {
        id: `spk-${Date.now()}`,
        name: cleanName,
        description: null,
        avatar_url: null,
        samples_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        samples: []
      };
      mockSpeakerProfiles.unshift(profile);
    }
    const sample = {
      id: `smp-${Date.now()}`,
      speaker_id: profile.id,
      source_type: "AUDIO_UPLOAD",
      source_id: String(filename || "sample.wav"),
      speaker_label: "UPLOAD",
      start_time: null,
      end_time: null,
      duration_seconds: null,
      metadata: { filename },
      created_at: new Date().toISOString()
    };
    profile.samples.unshift(sample);
    profile.samples_count += 1;
    return res.json({
      speaker_id: profile.id,
      speaker_name: profile.name,
      sample_id: sample.id,
      source_type: "AUDIO_UPLOAD",
      source_id: filename,
      speaker_label: "UPLOAD",
      segments_used: 1,
      speech_duration_seconds: 0.0,
      applied_to_diarization: false,
      samples_count: profile.samples_count
    });
  });

  app.post("/api/voice-recognition/diarization/:id/identify", (req, res) => {
    const { id } = req.params;
    const diar = mockDiarizations.find(d => d.id === id || d.entity_id === id);
    const firstProfile = mockSpeakerProfiles[0];
    const matches = [
      {
        original_speaker_label: "SPEAKER_00",
        current_speaker_label: firstProfile ? firstProfile.name : "SPEAKER_00",
        matched_speaker_id: firstProfile ? firstProfile.id : null,
        matched_speaker_name: firstProfile ? firstProfile.name : null,
        matched_sample_id: firstProfile?.samples[0]?.id || null,
        similarity_score: firstProfile ? 0.89 : 0.0,
        segments_count: 4,
        speech_duration_seconds: 28.5,
        identified: Boolean(firstProfile),
        applied: Boolean(firstProfile)
      },
      {
        original_speaker_label: "SPEAKER_01",
        current_speaker_label: "SPEAKER_01",
        matched_speaker_id: null,
        matched_speaker_name: null,
        matched_sample_id: null,
        similarity_score: 0.41,
        segments_count: 3,
        speech_duration_seconds: 19.0,
        identified: false,
        applied: false
      }
    ];
    if (firstProfile && diar?.result_json?.segments) {
      for (const seg of diar.result_json.segments) {
        if (seg.speaker === "SPEAKER_00") {
          seg.speaker = firstProfile.name;
        }
      }
    }
    return res.json({
      diarization_id: id,
      entity_id: diar?.entity_id || null,
      total_speakers: 2,
      identified_count: firstProfile ? 1 : 0,
      auto_applied: Boolean(firstProfile),
      matches
    });
  });

  app.post("/api/voice-recognition/diarization/:id/assign", (req, res) => {
    const { id } = req.params;
    const { speaker_label, speaker_name, enroll_voice } = req.body || {};
    const cleanName = String(speaker_name || "").trim();
    const diar = mockDiarizations.find(d => d.id === id || d.entity_id === id);
    if (diar?.result_json?.segments && cleanName) {
      for (const seg of diar.result_json.segments) {
        if (seg.speaker === speaker_label) {
          seg.speaker = cleanName;
        }
      }
      diar.result_json.speakers = Array.from(
        new Set(diar.result_json.segments.map((s: { speaker: string }) => s.speaker))
      );
    }
    return res.json({
      diarization_id: id,
      speaker_label,
      speaker_name: cleanName,
      enrolled: Boolean(enroll_voice),
      result_json: diar?.result_json || null
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

await startServer();

