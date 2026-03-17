"use client";

import { CloudDone, CloudOff, Storage, Sync } from "@mui/icons-material";
import {
    Button,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const API_BASE = "/api/proxy";

type StatusState = {
  status: "idle" | "checking" | "ok" | "error";
  message: string;
  lastChecked: string | null;
};

const statusConfig = {
  idle: { color: "default" as const, icon: <Sync fontSize="small" /> },
  checking: { color: "warning" as const, icon: <CircularProgress size={16} /> },
  ok: { color: "success" as const, icon: <CloudDone fontSize="small" /> },
  error: { color: "error" as const, icon: <CloudOff fontSize="small" /> },
};

export default function DbCheckCard() {
  const [status, setStatus] = useState<StatusState>({
    status: "idle",
    message: "Not checked",
    lastChecked: null,
  });

  const checkDatabase = async () => {
    setStatus((prev) => ({
      ...prev,
      status: "checking",
      message: "Checking database...",
    }));
    try {
      const response = await fetch(`${API_BASE}/health/db`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("DB check failed");
      }
      const data = await response.json().catch(() => null);
      const message = data?.status ? `OK (${data.status})` : "OK";
      setStatus({
        status: "ok",
        message,
        lastChecked: new Date().toLocaleString(),
      });
    } catch (error) {
      setStatus({
        status: "error",
        message: "Database unreachable",
        lastChecked: new Date().toLocaleString(),
      });
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  return (
    <Paper sx={{ width: "100%", p: 3, flex: 1 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Storage color="primary" />
          <Typography variant="h6">Test connection with DB</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Validates the connection between NestJS and PostgreSQL.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color="secondary"
            onClick={checkDatabase}
            disabled={status.status === "checking"}
          >
            Check database
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
      </Stack>
    </Paper>
  );
}
