import { useCallback, useEffect, useRef, useState } from "react";
import {
  COMPANION_STATUS_CONFIG,
  createCompanionContext,
  getNextStatus,
  getStatusDuration,
  type CompanionContext,
  type CompanionStatus,
} from "./engine";

export interface UseCompanionBrainOptions {
  initialStatus?: CompanionStatus;
  getContext?: () => CompanionContext;
  random?: () => number;
}

export function useCompanionBrain(options: UseCompanionBrainOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [status, setStatus] = useState<CompanionStatus>(options.initialStatus ?? "idle");
  const [cycle, setCycle] = useState(0);

  const transitionNow = useCallback(() => {
    setStatus((currentStatus) => {
      const { getContext = createCompanionContext, random = Math.random } = optionsRef.current;
      return getNextStatus(currentStatus, getContext(), random);
    });
    setCycle((value) => value + 1);
  }, []);

  const setCompanionStatus = useCallback((nextStatus: CompanionStatus) => {
    setStatus(nextStatus);
    setCycle((value) => value + 1);
  }, []);

  const { random = Math.random } = options;
  const duration = getStatusDuration(status, random);

  useEffect(() => {
    const timeout = window.setTimeout(transitionNow, duration);
    return () => window.clearTimeout(timeout);
  }, [cycle, duration, transitionNow]);

  return {
    status,
    duration,
    statusConfig: COMPANION_STATUS_CONFIG[status],
    transitionNow,
    setStatus: setCompanionStatus,
  };
}
