export async function submitVivaAnswer({ questionNumber, answer }) {
  return {
    questionNumber,
    answer,
    submittedAt: new Date().toISOString(),
  };
}

export async function endVivaSession() {
  return { ended: true, endedAt: new Date().toISOString() };
}

export async function recordTabSwitch({ warningNumber }) {
  return {
    warningNumber,
    recordedAt: new Date().toISOString(),
  };
}

export async function completeVivaSession(details) {
  return { completed: true, details, completedAt: new Date().toISOString() };
}
