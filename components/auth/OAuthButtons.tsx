"use client";

// Kept for back-compat; the auth forms now embed their own Google button
// when GOOGLE_CLIENT_ID is set. This component is a no-op shim.
export default function OAuthButtons() {
  return null;
}
