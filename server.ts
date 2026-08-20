import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
  }> = [
    {
      id: "src-1",
      name: "Fireship (Tech Highlights)",
      url: "https://www.youtube.com/@Fireship",
      type: "youtube",
      channelId: "UCsBjURrPoezykLs9EqgamOA",
      avatar: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=150&auto=format&fit=crop&q=80",
      subscriberCount: 3200000,
      lastCaptured: new Date().toISOString(),
      status: "active",
      totalCaptured: 142
    },
    {
      id: "src-2",
      name: "Curso em Vídeo (Gustavo Guanabara)",
      url: "https://www.youtube.com/@cursoemvideo",
      type: "youtube",
      channelId: "UC217i3aIu_p39YVshY60jkw",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      subscriberCount: 2100000,
      lastCaptured: new Date().toISOString(),
      status: "active",
      totalCaptured: 98
    }
  ];

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
  }> = [];


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
    return res.json({
      success: true,
      data: items
    });
  });

  /**
   * GET /api/diarization/list
   * Returns a paginated list of diarizations.
   */
  const mockDiarizations = [
    {
      id: "diar-1",
      step: "COMPLETED",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      entity_id: "vid-sample-1",
      entity_type: "YOUTUBE_VIDEO",
      title: "Top 10 AI Tools You Need in 2026",
      channelName: "Fireship",
      thumbnail: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=300&auto=format&fit=crop&q=80",
      duration: "08:42",
      result_json: {
        segments: [
          { speaker: "SPEAKER_00", start: 0.0, end: 4.5, text: "Welcome back! Today we are looking at the newest AI tools for developers." },
          { speaker: "SPEAKER_01", start: 4.8, end: 9.2, text: "Let us dive straight into tool number one, which completely transforms debugging." }
        ]
      }
    },
    {
      id: "diar-2",
      step: "TRANSCRIPTION",
      created_at: new Date(Date.now() - 1800000).toISOString(),
      entity_id: "vid-sample-2",
      entity_type: "YOUTUBE_VIDEO",
      title: "Python FastAPI 2.0 Full Architecture Guide",
      channelName: "Python Mastery",
      thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80",
      duration: "24:15",
      result_json: null
    },
    {
      id: "diar-3",
      step: "DIARIZATION",
      created_at: new Date(Date.now() - 900000).toISOString(),
      entity_id: "vid-sample-3",
      entity_type: "YOUTUBE_VIDEO",
      title: "Building Microservices with Docker & Postgres",
      channelName: "TechLead",
      thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      duration: "15:30",
      result_json: null
    }
  ];

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
          created_at: new Date().toISOString(),
          entity_id: v.postgresRecordId || v.id,
          entity_type: "YOUTUBE_VIDEO",
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
        const processingSteps = ["STARTED", "TRANSCRIPTION", "ALIGNMENT", "DIARIZATION", "PROCESSING"];
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

    return res.json({
      success: true,
      task_id: `task-diarize-${Date.now()}`,
      message: `Diarização iniciada para o vídeo ${id} (Idioma: ${language || 'Auto'})`
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
