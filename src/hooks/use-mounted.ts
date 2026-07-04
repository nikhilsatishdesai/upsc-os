"use client";

import * as React from "react";

/**
 * True after the component has mounted in the browser. Used to avoid
 * server/client mismatches for UI that depends on localStorage-persisted state.
 */
export function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}
