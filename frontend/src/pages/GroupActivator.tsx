import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWatchlistGroups } from "@/hooks/use-watchlist-groups";
import { WelcomePage } from "./WelcomePage";

export function GroupActivator() {
  const { groupId } = useParams<{ groupId: string }>();
  const { setActiveGroup } = useWatchlistGroups();

  useEffect(() => {
    if (groupId) setActiveGroup(groupId);
  }, [groupId, setActiveGroup]);

  return <WelcomePage />;
}
