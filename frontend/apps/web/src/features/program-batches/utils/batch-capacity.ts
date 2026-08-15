import type { BatchCapacity } from "../types/domain"
export function deriveCapacity(
  maximumStudents: number,
  currentStudents: number
): BatchCapacity {
  const availableSeats = Math.max(0, maximumStudents - currentStudents)
  const ratio = maximumStudents ? currentStudents / maximumStudents : 1
  return {
    maximumStudents,
    currentStudents,
    availableSeats,
    state:
      currentStudents > maximumStudents
        ? "over-capacity"
        : availableSeats === 0
          ? "full"
          : ratio >= 0.8
            ? "nearly-full"
            : "available",
  }
}
