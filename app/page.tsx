import { AiLeaderboardRadarApp } from "./ai-leaderboard-radar-app";
import { companies } from "@/lib/companies";

export default function Home() {
  return <AiLeaderboardRadarApp companies={companies} />;
}
