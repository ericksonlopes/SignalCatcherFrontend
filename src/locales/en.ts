import { TranslationKeys } from './pt';

export const en: Record<TranslationKeys, string> = {
  // Header Bar
  searchHeaderPlaceholder: "Search applications, sources, jobs or endpoints...",
  notificationsTitle: "Notifications & System Events",
  settingsBtn: "Settings",
  settingsHeader: "Settings",
  themeLabel: "Interface Theme",
  bentoDark: "Bento Dark",
  oledBlack: "OLED Black",
  lightBento: "Light Bento",
  languageLabel: "Language",
  executionPrefLabel: "Execution Preferences",
  liveEventStream: "Live Event Stream",

  // Header & Overview
  appTitle: "YouTube Catcher Engine",
  dbConnected: "PostgreSQL OK",
  appDescription: "Automated YouTube video capture • Daily ingestion • REST API FastAPI & PostgreSQL",
  
  // Stats
  activeSources: "Active Sources",
  postgresRecords: "PostgreSQL",
  scheduledJobs: "Scheduled Jobs",

  // Tabs
  capturedFeeds: "Ingested Videos",
  sources: "Channels",
  cronJobs: "Cron Jobs",

  // Action Buttons
  capturing: "Capturing...",
  runCaptureNow: "Run Capture Now",
  openVideo: "Open",
  btnNewIngestionOrSource: "Add",

  // Ingestion Modal
  modalIngestionTitle: "YouTube API Ingestion & Sources",
  modalIngestionSub: "Select the endpoint to ingest videos, playlists, or register YouTube channels.",
  tabVideoRoute: "/video",
  tabPlaylistRoute: "/playlist",
  tabCanalRoute: "/channel",
  descVideoRoute: "Ingests and extracts metadata from a single YouTube video URL.",
  descPlaylistRoute: "Ingests and extracts all videos from a YouTube playlist.",
  descSourcesRoute: "Registers a YouTube channel for continuous capture monitoring.",
  fieldUrlVideo: "Video URL",
  fieldUrlPlaylist: "Playlist URL",
  fieldUrlCanal: "Channel URL",
  fieldUrlSourcePlaceholder: "https://www.youtube.com/@channel_name",
  fieldUrlVideoPlaceholder: "https://www.youtube.com/watch?v=...",
  fieldUrlPlaylistPlaceholder: "https://www.youtube.com/playlist?list=...",
  fieldSaveInPlaylistFolder: "Save in playlist folder",
  fieldSaveInPlaylistFolderDesc: "Sends save_in_playlist_folder in POST request body",
  btnSubmitEndpoint: "Execute Ingestion",
  ingestingLoader: "Processing & Extracting Data...",
  btnSaveAndMonitor: "Save & Start Monitoring",

  // Filters & Search
  filterPlaceholder: "Filter captures by title, channel or tag...",
  allTags: "All Tags",

  // Sources Manager
  monitoredSources: "Monitored Channels",
  addSource: "Add Source",
  registerNewSource: "Register New Source in SignalCatcher",
  channelNameLabel: "Channel / Feed Name",
  sourceTypeLabel: "Source Type",
  sourceUrlLabel: "Source URL",
  cancel: "Cancel",
  confirmRegister: "Confirm Registration",

  // Sources Table
  tableChannelSource: "Channel / Source",
  tableType: "Type",
  tableSubscribers: "Subscribers",
  tableInterval: "Capture Interval",
  tableTotalIngested: "Total Ingested",
  tableLastCapture: "Last Capture",
  tableStatus: "Status",
  tableAction: "Action",
  every: "Every",
  min: "min",
  vids: "vids",

  // Jobs Manager
  jobsManagerTitle: "Scheduled Jobs Manager (FastAPI & PostgreSQL)",
  jobsManagerSubtitle: "Cron-based frequency + BackgroundTasks",
  target: "Target",
  lastRun: "Last Run",
  nextRun: "Next Run",
  totalExecutions: "Total Executions",
  avgTime: "Avg Duration",
  statusLabel: "Status",
  triggerNow: "Trigger Now",

  // Video Details Modal
  noDescription: "No description",
  videoDetails: "Video Details",
  fullDescription: "Full Description",
  tagsLabel: "Tags",
  noTags: "No tags registered.",
  noDescriptionAvailable: "No description available.",
  closeDetails: "Close Details",
  watchOnYouTube: "Watch on YouTube",

  // Notifications
  notifSendingVideo: "Sending POST request to ingest video:",
  notifSuccessVideo: "Video successfully added to processing queue! (Response:",
  notifErrorVideo: "Error ingesting video:",
  notifSendingPlaylist: "Sending POST request for playlist:",
  notifSuccessPlaylist: "Playlist successfully submitted!",
  notifErrorPlaylist: "Error processing playlist:",
  notifSendingSource: "Sending POST request to register source:",
  notifSuccessSource: "Source successfully registered! (ID:",
  notifErrorSource: "Error registering source:"
};
