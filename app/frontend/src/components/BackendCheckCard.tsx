"use client";

import { CloudDone, CloudOff, Sync } from "@mui/icons-material";
import {
    Button,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const API_BASE = "/api/proxy";

type InstanceInfo = {
  hostname: string;
  podName: string | null;
  podIp: string | null;
  nodeName: string | null;
};

type StatusState = {
  status: "idle" | "checking" | "ok" | "error";
  message: string;
  lastChecked: string | null;
  instance: InstanceInfo | null;
};

const statusConfig = {
  idle: { color: "default" as const, icon: <Sync fontSize="small" /> },
  checking: { color: "warning" as const, icon: <CircularProgress size={16} /> },
  ok: { color: "success" as const, icon: <CloudDone fontSize="small" /> },
  error: { color: "error" as const, icon: <CloudOff fontSize="small" /> },
};

const displayValue = (value: string | null | undefined) =>
  value && value.trim() !== "" ? value : "—";

export default function BackendCheckCard() {
  const [status, setStatus] = useState<StatusState>({
    status: "idle",
    message: "Not checked",
    lastChecked: null,
    instance: null,
  });

  const checkBackend = async () => {
    setStatus((prev) => ({
      ...prev,
      status: "checking",
      message: "Checking backend...",
      instance: null,
    }));
    try {
      const response = await fetch(`${API_BASE}/health`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Backend check failed");
      }
      const data = await response.json().catch(() => null);
      const message = data?.status ? `OK (${data.status})` : "OK";
      setStatus({
        status: "ok",
        message,
        lastChecked: new Date().toLocaleString(),
        instance: data?.instance ?? null,
      });
    } catch (error) {
      setStatus({
        status: "error",
        message: "Backend unreachable",
        lastChecked: new Date().toLocaleString(),
        instance: null,
      });
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <Paper sx={{ width: "100%", p: 3, flex: 1 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CloudDone color="primary" />
          <Typography variant="h6">Test connection with backend</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Confirms that the app tier is reachable and responding.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            onClick={checkBackend}
            disabled={status.status === "checking"}
          >
            Check backend
          </Button>
          <Chip
            icon={statusConfig[status.status].icon}
            label={status.message}
            color={statusConfig[status.status].color}
            variant="outlined"
          />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Last check: {status.lastChecked ?? "Never"}
        </Typography>

        {status.instance && (
          <>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">
              Responding pod
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Hostname
                </Typography>
                <Typography variant="body2">
                  {displayValue(status.instance.hostname)}
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Pod name
                </Typography>
                <Typography variant="body2">
                  {displayValue(status.instance.podName)}
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Pod IP
                </Typography>
                <Typography variant="body2">
                  {displayValue(status.instance.podIp)}
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Node name
                </Typography>
                <Typography variant="body2">
                  {displayValue(status.instance.nodeName)}
                </Typography>
              </Stack>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
