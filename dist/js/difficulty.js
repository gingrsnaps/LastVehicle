/** Difficulty affects perception and movement, not story gates or save access.
 * All three modes preserve clues and checkpoints; only pursuit pressure changes. */
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    id: "easy", intercept:false,
    boltStun:2.1,boltSightDelay:.4,
    label: "Easy",
    description:
      "More breathing room. Slower pursuit, quieter footsteps, and generous stamina.",
    attackWindup: .9, attackRecovery: 1.2, listen: 1.5, searchRadius: 5, searchChecks: 3, predictDistance: 1.8, predictTime: 1.2, lureRetention: .88,
    chase: 3.25,
    investigate: 1.5,
    lure: 2.35,
    standingVision: 16,
    crouchVision: 10,
    awareness: 0.75,
    hearing: 0.65,
    search: 6,
    memory: 5,
    grace: 12,
    checkRadius: 0,
    inspection: 3.6,
    staminaDrain: 0.075,
    staminaRecovery: 0.22,
  }),
  medium: Object.freeze({
    id: "medium", intercept:true,
    boltStun:1.55,boltSightDelay:.7,
    label: "Medium",
    description:
      "The intended balance. Listen, break line of sight, and plan your escape.",
    attackWindup: .72, attackRecovery: .95, listen: 1.1, searchRadius: 8, searchChecks: 5, predictDistance: 3.4, predictTime: 2, lureRetention: .7,
    chase: 4.05,
    investigate: 2.05,
    lure: 2.7,
    standingVision: 21,
    crouchVision: 13,
    awareness: 1,
    hearing: 1,
    search: 10,
    memory: 7,
    grace: 9,
    checkRadius: 3,
    inspection: 3,
    staminaDrain: 0.115,
    staminaRecovery: 0.14,
  }),
  hard: Object.freeze({
    id: "hard", intercept:true,
    boltStun:1.05,boltSightDelay:1,
    label: "Hard",
    description:
      "A faster, more alert Attendant. Longer searches and less sprint endurance.",
    attackWindup: .58, attackRecovery: .75, listen: .8, searchRadius: 11, searchChecks: 7, predictDistance: 5, predictTime: 2.6, lureRetention: .55,
    chase: 4.6,
    investigate: 2.35,
    lure: 3.05,
    standingVision: 25,
    crouchVision: 16,
    awareness: 1.35,
    hearing: 1.3,
    search: 16,
    memory: 9,
    grace: 7,
    checkRadius: 5,
    inspection: 2.6,
    staminaDrain: 0.16,
    staminaRecovery: 0.11,
  }),
});
export function difficultyId(value) {
  return typeof value === "string" && Object.hasOwn(DIFFICULTIES, value)
    ? value
    : "medium";
}
export function difficultyRules(value) {
  return DIFFICULTIES[difficultyId(value)];
}
