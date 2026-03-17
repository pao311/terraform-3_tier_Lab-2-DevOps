import { Dns } from "@mui/icons-material";
import {
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export type InstanceInfo = {
  hostname: string;
  podName: string | null;
  podIp: string | null;
  nodeName: string | null;
};

type InstanceDetailsCardProps = {
  instanceInfo: InstanceInfo;
};

const displayValue = (value: string | null | undefined) =>
  value && value.trim() !== "" ? value : "Unavailable";

export default function InstanceDetailsCard({
  instanceInfo,
}: InstanceDetailsCardProps) {
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Dns color="primary" />
          <Typography variant="h6">Instance details</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Highlights which instance served this request.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Hostname
            </Typography>
            <Typography>{displayValue(instanceInfo.hostname)}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Pod name
            </Typography>
            <Typography>{displayValue(instanceInfo.podName)}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Pod IP
            </Typography>
            <Typography>{displayValue(instanceInfo.podIp)}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Node name
            </Typography>
            <Typography>{displayValue(instanceInfo.nodeName)}</Typography>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
