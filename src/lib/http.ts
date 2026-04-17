import { NextResponse } from "next/server";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
