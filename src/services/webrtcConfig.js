/**
 * Centralized WebRTC Configuration
 * Defines STUN/TURN servers for ICE candidate negotiation across Student and Teacher clients.
 * Uses Google's high-availability STUN servers by default, with .env override for TURN relays.
 */
import { STUN_URLS, TURN_CONFIG } from "../config/env";

export const getWebRTCConfig = () => ({
  iceServers: [
    ...(STUN_URLS.length > 0
      ? STUN_URLS.map((urls) => ({ urls }))
      : [{ urls: "stun:stun.l.google.com:19302" }]),
    ...(TURN_CONFIG ? [TURN_CONFIG] : []),
  ],
  iceCandidatePoolSize: 10,
});

export default getWebRTCConfig;
