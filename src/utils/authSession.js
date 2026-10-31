import { STORAGE_KEYS } from '../constants/storage';
import { ROLES } from '../constants/roles';
import { storage } from './storage';

const TOKEN_KEY = {
  [ROLES.TEACHER]: STORAGE_KEYS.TEACHER_TOKEN,
  [ROLES.STUDENT]: STORAGE_KEYS.STUDENT_TOKEN,
};

export function setAuthSession(role, token) {
  const other = role === ROLES.TEACHER ? ROLES.STUDENT : ROLES.TEACHER;
  storage.remove(TOKEN_KEY[other]);
  storage.set(TOKEN_KEY[role], token);
  storage.set(STORAGE_KEYS.ACTIVE_ROLE, role);
}

export function clearAuthSession() {
  Object.values(TOKEN_KEY).forEach((k) => storage.remove(k));
  storage.remove(STORAGE_KEYS.ACTIVE_ROLE);
  storage.remove(STORAGE_KEYS.TEACHER_INFO);
}

export const getActiveRole = () => storage.get(STORAGE_KEYS.ACTIVE_ROLE);

export function getAuthToken() {
  const role = getActiveRole();
  if (role && TOKEN_KEY[role]) return storage.get(TOKEN_KEY[role]);
  // Legacy fallback
  return storage.get(TOKEN_KEY[ROLES.TEACHER]) || storage.get(TOKEN_KEY[ROLES.STUDENT]);
}
