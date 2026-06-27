"use client";

export {
  createSighting,
  deleteSighting,
  findPotentialDuplicateSightings,
  getSighting,
  getSightings,
  isOwnedSighting,
  updateSighting,
  updateSightingReview,
  updateSightingStatus,
} from "@/lib/pet-store";

export type { Sighting } from "@/lib/demo-data";
