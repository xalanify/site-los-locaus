const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const API_KEY = process.env.YOUTUBE_API_KEY || '';
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || '';
const CHANNEL_URL = process.env.YOUTUBE_CHANNEL_URL || `https://www.youtube.com/channel/${CHANNEL_ID}`;

const isConfigured = () =>
  API_KEY && CHANNEL_ID && !API_KEY.startsWith('AQUI_') && !CHANNEL_ID.startsWith('AQUI_');

// Cache
let cache = { channel: null, videos: null, lastUpdate: 0 };
const CACHE_TIME = 5 * 60 * 1000;

async function getVideos() {
  if (cache.videos && Date.now() - cache.lastUpdate < CACHE_TIME) return cache.videos;
  if (!isConfigured()) return [];

  const playlistUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
  const playlistResponse = await fetch(playlistUrl);
  const playlistData = await playlistResponse.json();

  if (!playlistData.items || playlistData.items.length === 0) return [];

  const uploadsPlaylistId = playlistData.items[0].contentDetails.relatedPlaylists.uploads;

  const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${API_KEY}`;
  const videosResponse = await fetch(videosUrl);
  const videosData = await videosResponse.json();

  if (!videosData.items) return [];

  const videoIds = videosData.items.map((item) => item.contentDetails.videoId).join(',');
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,status&id=${videoIds}&key=${API_KEY}`;
  const statsResponse = await fetch(statsUrl);
  const statsData = await statsResponse.json();

  const videos = videosData.items.map((item) => {
    const stats = (statsData.items || []).find((s) => s.id === item.contentDetails.videoId);
    return {
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      description: (item.snippet.description || '').slice(0, 500),
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      publishedAt: item.snippet.publishedAt,
      views: stats ? parseInt(stats.statistics.viewCount) || 0 : 0,
      likes: stats ? parseInt(stats.statistics.likeCount) || 0 : 0,
      comments: stats ? parseInt(stats.statistics.commentCount) || 0 : 0,
      privacyStatus: stats?.status?.privacyStatus || 'public',
    };
  });

  cache.videos = videos;
  cache.lastUpdate = Date.now();
  return videos;
}

// Dados do canal
router.get('/channel', async (req, res) => {
  try {
    if (cache.channel && Date.now() - cache.lastUpdate < CACHE_TIME) {
      return res.json(cache.channel);
    }
    if (!isConfigured()) return res.status(503).json({ error: 'API não configurada' });

    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${CHANNEL_ID}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      cache.channel = { ...data.items[0], channelUrl: CHANNEL_URL };
      cache.lastUpdate = Date.now();
      return res.json(cache.channel);
    }
    res.status(404).json({ error: 'Canal não encontrado' });
  } catch (error) {
    console.error('Erro channel:', error.message);
    res.status(500).json({ error: 'Erro ao obter canal' });
  }
});

// Todos os vídeos
router.get('/videos', async (req, res) => {
  try {
    const videos = await getVideos();
    res.json(videos);
  } catch (error) {
    console.error('Erro videos:', error.message);
    res.json([]);
  }
});

// Mais assistidos (30 dias)
router.get('/top-videos', async (req, res) => {
  try {
    const videos = await getVideos();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topVideos = videos
      .filter((v) => new Date(v.publishedAt) >= thirtyDaysAgo)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    res.json(topVideos);
  } catch (error) {
    console.error('Erro top-videos:', error.message);
    res.json([]);
  }
});

// Estatísticas de vídeos (públicos/privados/não listados/apagados)
router.get('/video-stats', async (req, res) => {
  try {
    const videos = await getVideos();
    res.json({
      public: videos.filter((v) => v.privacyStatus === 'public').length,
      private: videos.filter((v) => v.privacyStatus === 'private').length,
      unlisted: videos.filter((v) => v.privacyStatus === 'unlisted').length,
      deleted: 0, // vídeos apagados não são visíveis via API pública
      total: videos.length,
    });
  } catch (error) {
    console.error('Erro video-stats:', error.message);
    res.json({ public: 0, private: 0, unlisted: 0, deleted: 0, total: 0 });
  }
});

// Comentários de um vídeo (inclui respostas)
router.get('/comments/:videoId', async (req, res) => {
  try {
    const videoId = String(req.params.videoId).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!videoId) return res.json([]);
    if (!isConfigured()) return res.json([]);

    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=50&order=relevance&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) return res.json([]);

    const strip = (html) => (html || '').replace(/<[^>]*>/g, '').slice(0, 1000);

    const comments = [];
    for (const item of data.items) {
      const top = item.snippet.topLevelComment.snippet;
      comments.push({
        id: item.id,
        author: top.authorDisplayName,
        authorImage: top.authorProfileImageUrl,
        text: strip(top.textDisplay),
        likes: top.likeCount || 0,
        publishedAt: top.publishedAt,
        isReply: false,
      });

      // Respostas ao comentário
      const replies = item.replies?.comments || [];
      for (const reply of replies) {
        const rs = reply.snippet;
        comments.push({
          id: reply.id,
          author: rs.authorDisplayName,
          authorImage: rs.authorProfileImageUrl,
          text: strip(rs.textDisplay),
          likes: rs.likeCount || 0,
          publishedAt: rs.publishedAt,
          isReply: true,
        });
      }
    }

    res.json(comments);
  } catch (error) {
    console.error('Erro comments:', error.message);
    res.json([]);
  }
});

module.exports = { youtubeRouter: router };
