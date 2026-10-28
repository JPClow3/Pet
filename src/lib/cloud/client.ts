"use client";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();
export function getCloudClient() {
  return authClient;
}
export type CloudUser = { id: string; email: string; emailVerified: boolean };
