/**
 * Eye Gaze & Iris Position Estimator for MediaPipe FaceLandmarker
 *
 * MediaPipe Face Mesh indices:
 * - Left eye:  Iris Center = 468, Outer = 33,  Inner = 133, Top = 159, Bottom = 145
 * - Right eye: Iris Center = 473, Inner = 362, Outer = 263, Top = 386, Bottom = 374
 */

const EPSILON = 0.0001;

/**
 * Calculates Horizontal & Vertical Gaze ratios, eye aspect ratios, and determines
 * if the user's eye gaze is centered on screen or deviating off-screen.
 *
 * @param {Array<{x: number, y: number, z?: number}>} landmarks - 478 MediaPipe face landmarks
 * @param {Array<{categoryName: string, score: number}>} [blendshapes] - MediaPipe ARKit blendshapes
 * @returns {Object} Gaze result { direction, label, hgr, vgr, isBlinking, isLookingAway }
 */
export function estimateGaze(landmarks, blendshapes = []) {
  if (!landmarks || landmarks.length < 474) {
    return {
      direction: "CENTER",
      label: "Focused on Screen",
      hgr: 0.5,
      vgr: 0.5,
      isBlinking: false,
      isLookingAway: false,
    };
  }

  // Extract blendshape scores as a key-value map for quick lookup
  const bsMap = {};
  for (const b of blendshapes || []) {
    bsMap[b.categoryName] = b.score;
  }

  // -------------------------------------------------------------
  // 1. Blink Detection (Eye Aspect Ratio + Blendshapes)
  // -------------------------------------------------------------
  const leftEyeHeight = Math.abs(landmarks[159].y - landmarks[145].y);
  const leftEyeWidth = Math.abs(landmarks[133].x - landmarks[33].x) || EPSILON;
  const leftEAR = leftEyeHeight / (2 * leftEyeWidth);

  const rightEyeHeight = Math.abs(landmarks[386].y - landmarks[374].y);
  const rightEyeWidth = Math.abs(landmarks[263].x - landmarks[362].x) || EPSILON;
  const rightEAR = rightEyeHeight / (2 * rightEyeWidth);

  const avgEAR = (leftEAR + rightEAR) / 2;
  const isBlendshapeBlink = (bsMap["eyeBlinkLeft"] || 0) > 0.55 || (bsMap["eyeBlinkRight"] || 0) > 0.55;
  const isBlinking = avgEAR < 0.16 || isBlendshapeBlink;

  if (isBlinking) {
    return {
      direction: "BLINK",
      label: "Blinking / Eyes Closed",
      hgr: 0.5,
      vgr: 0.5,
      isBlinking: true,
      isLookingAway: false,
    };
  }

  // -------------------------------------------------------------
  // 2. Horizontal Gaze Ratio (HGR)
  // -------------------------------------------------------------
  // Left eye: distance from iris to outer canthus divided by total eye width
  const leftIrisX = landmarks[468].x;
  const leftOuterX = landmarks[33].x;
  const leftInnerX = landmarks[133].x;
  const leftEyeSpanX = Math.abs(leftInnerX - leftOuterX) || EPSILON;
  const leftHGR = Math.abs(leftIrisX - Math.min(leftOuterX, leftInnerX)) / leftEyeSpanX;

  // Right eye: distance from iris to outer canthus divided by total eye width
  const rightIrisX = landmarks[473].x;
  const rightOuterX = landmarks[263].x;
  const rightInnerX = landmarks[362].x;
  const rightEyeSpanX = Math.abs(rightOuterX - rightInnerX) || EPSILON;
  const rightHGR = Math.abs(rightIrisX - Math.min(rightOuterX, rightInnerX)) / rightEyeSpanX;

  const avgHGR = (leftHGR + rightHGR) / 2;

  // -------------------------------------------------------------
  // 3. Vertical Gaze Ratio (VGR)
  // -------------------------------------------------------------
  const leftIrisY = landmarks[468].y;
  const leftTopY = landmarks[159].y;
  const leftBottomY = landmarks[145].y;
  const leftEyeSpanY = Math.abs(leftBottomY - leftTopY) || EPSILON;
  const leftVGR = (leftIrisY - Math.min(leftTopY, leftBottomY)) / leftEyeSpanY;

  const rightIrisY = landmarks[473].y;
  const rightTopY = landmarks[386].y;
  const rightBottomY = landmarks[374].y;
  const rightEyeSpanY = Math.abs(rightBottomY - rightTopY) || EPSILON;
  const rightVGR = (rightIrisY - Math.min(rightTopY, rightBottomY)) / rightEyeSpanY;

  const avgVGR = (leftVGR + rightVGR) / 2;

  // -------------------------------------------------------------
  // 4. Blendshape Confirmation Scores
  // -------------------------------------------------------------
  const lookLeftScore = Math.max(bsMap["eyeLookInRight"] || 0, bsMap["eyeLookOutLeft"] || 0);
  const lookRightScore = Math.max(bsMap["eyeLookInLeft"] || 0, bsMap["eyeLookOutRight"] || 0);
  const lookDownScore = Math.max(bsMap["eyeLookDownLeft"] || 0, bsMap["eyeLookDownRight"] || 0);
  const lookUpScore = Math.max(bsMap["eyeLookUpLeft"] || 0, bsMap["eyeLookUpRight"] || 0);

  // -------------------------------------------------------------
  // 5. Gaze Direction Classification
  // -------------------------------------------------------------
  // Centered range: HGR ~ 0.40 - 0.60, VGR ~ 0.40 - 0.66
  let direction = "CENTER";
  let label = "Focused on Screen";
  let isLookingAway = false;

  if (avgHGR < 0.35 || lookLeftScore > 0.62) {
    direction = "GAZE_LEFT";
    label = "Gaze Left (Off-screen)";
    isLookingAway = true;
  } else if (avgHGR > 0.65 || lookRightScore > 0.62) {
    direction = "GAZE_RIGHT";
    label = "Gaze Right (Off-screen)";
    isLookingAway = true;
  } else if (avgVGR > 0.72 || lookDownScore > 0.65) {
    direction = "GAZE_DOWN";
    label = "Gaze Down (Notes / Desk / Phone)";
    isLookingAway = true;
  } else if (avgVGR < 0.32 || lookUpScore > 0.65) {
    direction = "GAZE_UP";
    label = "Gaze Up (Above Monitor)";
    isLookingAway = true;
  }

  return {
    direction,
    label,
    hgr: Number(avgHGR.toFixed(3)),
    vgr: Number(avgVGR.toFixed(3)),
    isBlinking: false,
    isLookingAway,
  };
}
