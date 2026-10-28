import { verifiedCloudUser } from "@/lib/cloud/server-auth";
import { createCardHandlers } from "@/lib/cloud/card-handler";
import { mutateOwnedCard, readOwnedCard } from "@/lib/cloud/server-cards";
export const dynamic = "force-dynamic";
export const { GET, POST } = createCardHandlers({
  currentUser: verifiedCloudUser,
  read: readOwnedCard,
  mutate: mutateOwnedCard,
});
