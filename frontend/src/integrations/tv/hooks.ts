'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGraphQL } from '@/hooks/use-graphql';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import { TVSessionManager } from './session-handoff';
import { emitTelemetry, TelemetryEventType, translateTVError } from './telemetry';

const ADMISSION_QUERY = `
  mutation AdmitStream($userId: uuid!, $familyId: uuid!, $contentId: String!, $deviceId: uuid) {
    admit_stream(user_id: $userId, family_id: $familyId, content_id: $contentId, device_id: $deviceId) {
      admitted session_id session_token playback_url denial_reason
    }
  }
`;

/**
 * Hook to manage TV session lifecycle.
 * @returns Session manager and control functions
 */
export function useTVSession() {
  const managerRef = useRef(new TVSessionManager());
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  const [session, setSession] = useState(managerRef.current.getSession());

  const startSession = useCallback(async (contentId?: string) => {
    if (!familyId || !userId) return null;

    emitTelemetry(TelemetryEventType.HANDOFF_INITIATED, { family_id: familyId, content_id: contentId });
    const start = Date.now();

    const result = await managerRef.current.handoff({
      family_jwt: '', // Would come from auth store in production
      family_id: familyId,
      user_id: userId,
      target_content_id: contentId,
    });

    const latency = Date.now() - start;

    if (result.success && result.session) {
      setSession(result.session);
      emitTelemetry(TelemetryEventType.HANDOFF_COMPLETED, { latency_ms: latency });
      return result.session;
    } else {
      emitTelemetry(TelemetryEventType.HANDOFF_FAILED, { error: result.error, latency_ms: latency });
      return null;
    }
  }, [familyId, userId]);

  const endSession = useCallback(() => {
    managerRef.current.endSession();
    setSession(null);
    emitTelemetry(TelemetryEventType.SESSION_END);
  }, []);

  return {
    session,
    isActive: managerRef.current.isValid(),
    startSession,
    endSession,
    version: managerRef.current.getVersion(),
  };
}

/**
 * Hook for stream admission handshake with the gateway.
 * @returns Admission mutation and state
 */
export function useTVAdmission() {
  const { execute: gql } = useGraphQL();
  const userId = useAuthStore((s) => s.user?.id);
  const familyId = useFamilyStore((s) => s.activeFamilyId);

  return useMutation({
    mutationFn: async (params: { contentId: string; deviceId?: string }) => {
      if (!userId || !familyId) throw new Error('Not authenticated');

      const data = await gql(ADMISSION_QUERY, {
        userId, familyId,
        contentId: params.contentId,
        deviceId: params.deviceId ?? null,
      });

      const result = data.admit_stream;
      if (!result.admitted) {
        emitTelemetry(TelemetryEventType.ADMISSION_DENIED, { reason: result.denial_reason });
        throw new Error(translateTVError(result.denial_reason ?? 'UNKNOWN'));
      }

      emitTelemetry(TelemetryEventType.PLAYBACK_STARTED, { content_id: params.contentId });
      return result;
    },
  });
}
