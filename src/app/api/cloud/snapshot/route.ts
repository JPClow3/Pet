import { verifiedCloudUser } from "@/lib/cloud/server-auth";
import { createSnapshotHandlers } from "@/lib/cloud/snapshot-handler";
import {
  deleteServerSnapshot,
  readServerSnapshot,
  saveServerSnapshot,
} from "@/lib/cloud/server-snapshots";

export const dynamic = "force-dynamic";
export const { GET, PUT, DELETE } = createSnapshotHandlers({
  currentUser: verifiedCloudUser,
  read: readServerSnapshot,
  save: saveServerSnapshot,
  remove: deleteServerSnapshot,
});
