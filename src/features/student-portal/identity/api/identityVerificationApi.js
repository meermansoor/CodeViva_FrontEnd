export async function captureIdentityPhoto(photo) {
  return { photo, verified: Boolean(photo), capturedAt: new Date().toISOString() };
}
