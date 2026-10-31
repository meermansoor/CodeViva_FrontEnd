const enc = encodeURIComponent;

export const ENDPOINTS = Object.freeze({
  HEALTH: '/api/health',

  // Auth routes (backend/routes/authRoutes.js)
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',

  // Teacher routes (backend/routes/teacherRoutes.js)
  TEACHER_DASHBOARD: '/api/teacher/dashboard',
  TEACHER_ANALYTICS: '/api/teacher/analytics',
  TEACHER_EXAM_ROOMS: '/api/teacher/exam-rooms',
  TEACHER_SESSIONS: '/api/teacher/sessions',
  TEACHER_SESSION: (id) => `/api/teacher/session/${enc(id)}`,
  TEACHER_SESSION_ANSWER: (sessionId, qIndex) => `/api/teacher/session/${enc(sessionId)}/answer/${enc(qIndex)}`,
  TEACHER_EXPORT_EXCEL: '/api/teacher/export/excel',
  END_EXAM_ROOM: (roomId) => `/api/teacher/exam-rooms/${enc(roomId)}/end`,

  // Question Bank routes (backend/routes/questionRoutes.js)
  QUESTIONS: '/api/questions',
  QUESTIONS_GENERATE: '/api/questions/generate',
  QUESTIONS_SYLLABUS: (syllabusId) => `/api/questions/syllabus/${enc(syllabusId)}`,
  QUESTION_BANK: (id) => `/api/questions/${enc(id)}`,

  // Viva Student routes (backend/routes/vivaRoutes.js)
  VIVA_ROOM: (roomCode) => `/api/viva/room/${enc(roomCode)}`,
  VIVA_SESSION_START: '/api/viva/session/start',
  VIVA_SESSION: (id) => `/api/viva/session/${enc(id)}`,
  VIVA_SESSION_ACTION: (id) => `/api/viva/session/${enc(id)}/action`,
  VIVA_SESSION_COMPLETE: (id) => `/api/viva/session/${enc(id)}/complete`,

  // Audio files (backend/server.js)
  AUDIO_FILE: (syllabusId, filename) =>
    filename ? `/api/audio/file/${enc(syllabusId)}/${enc(filename)}` : `/api/audio/file/${enc(syllabusId)}`,
});
