"use client";

import { Architecture } from "@mui/icons-material";
import { Paper, Stack, Typography } from "@mui/material";
import Image from "next/image";

export default function ArchitectureDiagramCard() {
  return (
    <Paper sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Architecture color="primary" />
          <Typography variant="h6">Architecture Diagram</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Full overview of the three-tier AWS infrastructure.
        </Typography>
        <Image
          src="/Full Architecture Diagram.svg"
          alt="Full Architecture Diagram"
          width={900}
          height={1600}
          style={{ maxWidth: "100%", height: "auto", borderRadius: 1, display: "block", margin: "0 auto" }}
          priority
        />
      </Stack>
    </Paper>
  );
}
