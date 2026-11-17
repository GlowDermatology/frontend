"use client";

import { useCopy } from "@/lib/i18n/admin-context";

import { sharedCopy } from "./copy";

/** «Yuklanmoqda…» in the admin language (a client leaf, so server placeholders can use it). */
export function LoadingLabel() {
  return useCopy(sharedCopy).loading;
}
