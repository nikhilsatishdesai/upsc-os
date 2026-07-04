"use client";

import * as React from "react";

const emptySubscribe = () => () => {};

/**
 * False during server rendering and hydration, true once the component is
 * live in the browser. Used to avoid server/client mismatches for UI that
 * depends on localStorage-persisted state.
 */
export function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
