import { NextRequest, NextResponse } from "next/server";

const DEFAULT_AUTH_HEADERS = [
  "x-forwarded-user",
  "x-authenticated-user",
  "x-sso-user",
  "x-remote-user",
];

const DEFAULT_GROUP_HEADERS = [
  "x-forwarded-groups",
  "x-auth-groups",
  "x-sso-groups",
];

const DEFAULT_ADMIN_GROUPS = ["admin", "admins", "perf-admin", "performance-admin"];

export interface SessionInfo {
  user: string;
  groups: string[];
}

function normalizeHeader(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getHeader(request: NextRequest, name: string): string | null {
  return normalizeHeader(request.headers.get(name));
}

function getUserFromHeaders(request: NextRequest): string | null {
  const explicitHeader = process.env.INTERNAL_AUTH_HEADER?.toLowerCase();
  if (explicitHeader) {
    return getHeader(request, explicitHeader);
  }

  for (const header of DEFAULT_AUTH_HEADERS) {
    const value = getHeader(request, header);
    if (value) return value;
  }
  return null;
}

function parseGroupHeader(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[;,\s]+/)
    .map((group) => group.trim())
    .filter(Boolean);
}

function getGroupsFromHeaders(request: NextRequest): string[] {
  const explicitHeader = process.env.INTERNAL_GROUPS_HEADER?.toLowerCase();
  if (explicitHeader) {
    return parseGroupHeader(getHeader(request, explicitHeader));
  }

  for (const header of DEFAULT_GROUP_HEADERS) {
    const value = getHeader(request, header);
    if (value) return parseGroupHeader(value);
  }

  return [];
}

export function requireSession(
  request: NextRequest
): SessionInfo | NextResponse {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const groups = getGroupsFromHeaders(request);
  return { user, groups };
}

function isAdminUser(user: string, groups: string[]): boolean {
  const adminUsers = (process.env.INTERNAL_ADMIN_USERS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (adminUsers.includes(user)) return true;

  const configuredAdminGroups = (process.env.INTERNAL_ADMIN_GROUPS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const adminGroups = configuredAdminGroups.length > 0
    ? configuredAdminGroups
    : DEFAULT_ADMIN_GROUPS;

  return groups.some((group) => adminGroups.includes(group.toLowerCase()));
}

export function requireAdmin(
  request: NextRequest
): SessionInfo | NextResponse {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;

  if (!isAdminUser(session.user, session.groups)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  return session;
}
