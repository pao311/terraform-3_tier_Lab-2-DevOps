import os from "os";
import HomeClient from "./page-client";

export const dynamic = "force-dynamic";

export default function Home() {
  const instanceInfo = {
    hostname: os.hostname(),
    podName: process.env.POD_NAME ?? process.env.INSTANCE_ID ?? null,
    podIp: process.env.POD_IP ?? process.env.INSTANCE_PRIVATE_IP ?? null,
    nodeName: process.env.NODE_NAME ?? process.env.INSTANCE_AZ ?? null,
  };

  return <HomeClient instanceInfo={instanceInfo} />;
}
