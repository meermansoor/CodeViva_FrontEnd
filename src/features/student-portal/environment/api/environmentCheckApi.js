export async function checkStudentEnvironment() {
  return { webcam: "passed", microphone: "passed", fullscreen: "warning" };
}
