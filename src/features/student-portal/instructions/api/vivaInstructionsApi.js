export async function startScheduledViva(session) {
  return { started: true, session, startedAt: new Date().toISOString() };
}
