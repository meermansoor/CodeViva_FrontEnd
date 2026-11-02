/**
 * Centralized Socket.IO Event Names and Payload Type Constants
 * Mirrored directly from backend/socket/events.js and backend/socket/socketService.js
 */

export const SOCKET_EVENTS = Object.freeze({
  // Client -> Server
  AUDIO_START: 'audio:start',
  AUDIO_CHUNK: 'audio:chunk',
  AUDIO_STOP: 'audio:stop',
  VIDEO_FRAME: 'video:frame',
  VIDEO_SUBSCRIBE: 'video:subscribe',
  VIDEO_UNSUBSCRIBE: 'video:unsubscribe',
  PROCTOR_VIOLATION: 'proctor:violation',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',

  // Server -> Client
  AUDIO_TRANSCRIPT: 'audio:transcript',
  AUDIO_ERROR: 'audio:error',
  TEACHER_LIVE_UPDATE: 'teacher:live_update',
  TEACHER_VIDEO_FRAME: 'teacher:video_frame',
  VIDEO_STREAM_START: 'video:stream_start',
  VIDEO_STREAM_STOP: 'video:stream_stop',
  ROOM_CLOSED: 'room:closed',

  // WebRTC Signaling Events
  WEBRTC_INIT: 'webrtc:init',
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc:ice',
  WEBRTC_CLOSE: 'webrtc:close',

  // Legacy compatibility events (backend emits both)
  LEGACY_TEACHER_LIVE_UPDATE: 'teacher_live_update',
  LEGACY_ROOM_CLOSED: 'ROOM_CLOSED',
});

export const LIVE_UPDATE_TYPE = Object.freeze({
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_UPDATED: 'SESSION_UPDATED',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  PROCTOR_ALERT: 'PROCTOR_ALERT',
});
