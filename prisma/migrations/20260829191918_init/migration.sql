-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchCommunityStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CommunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "gameSystemId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "discordGuildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lifetimeElo" INTEGER NOT NULL DEFAULT 1000,
    "lifetimeWins" INTEGER NOT NULL DEFAULT 0,
    "lifetimeLosses" INTEGER NOT NULL DEFAULT 0,
    "lifetimeDraws" INTEGER NOT NULL DEFAULT 0,
    "seasonElo" INTEGER NOT NULL DEFAULT 1000,
    "seasonWins" INTEGER NOT NULL DEFAULT 0,
    "seasonLosses" INTEGER NOT NULL DEFAULT 0,
    "seasonDraws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" TEXT NOT NULL,
    "gameSystemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerFaction" (
    "id" TEXT NOT NULL,
    "communityMemberId" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "lifetimeElo" INTEGER NOT NULL DEFAULT 1000,
    "lifetimeWins" INTEGER NOT NULL DEFAULT 0,
    "lifetimeLosses" INTEGER NOT NULL DEFAULT 0,
    "lifetimeDraws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerFaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonSnapshot" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "communityMemberId" TEXT NOT NULL,
    "seasonElo" INTEGER NOT NULL,
    "rank" INTEGER,

    CONSTRAINT "SeasonSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "gameSystemId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "playerOneId" TEXT NOT NULL,
    "playerTwoId" TEXT NOT NULL,
    "playerOneFactionId" TEXT NOT NULL,
    "playerTwoFactionId" TEXT NOT NULL,
    "playerOneScore" INTEGER,
    "playerTwoScore" INTEGER,
    "winnerId" TEXT,
    "confirmedById" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "playedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "mission" TEXT,
    "notes" TEXT,
    "disputeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchCommunity" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "seasonId" TEXT,
    "status" "MatchCommunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "playerOneEloBefore" INTEGER,
    "playerOneEloAfter" INTEGER,
    "playerTwoEloBefore" INTEGER,
    "playerTwoEloAfter" INTEGER,
    "playerOneFactionEloBefore" INTEGER,
    "playerOneFactionEloAfter" INTEGER,
    "playerTwoFactionEloBefore" INTEGER,
    "playerTwoFactionEloAfter" INTEGER,
    "playerOneSeasonEloBefore" INTEGER,
    "playerOneSeasonEloAfter" INTEGER,
    "playerTwoSeasonEloBefore" INTEGER,
    "playerTwoSeasonEloAfter" INTEGER,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchCommunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterInvite" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordChapter" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSystem_name_key" ON "GameSystem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GameSystem_slug_key" ON "GameSystem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Community_discordGuildId_key" ON "Community"("discordGuildId");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_idx" ON "CommunityMember"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_userId_communityId_key" ON "CommunityMember"("userId", "communityId");

-- CreateIndex
CREATE INDEX "Faction_gameSystemId_idx" ON "Faction"("gameSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "Faction_gameSystemId_name_key" ON "Faction"("gameSystemId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Faction_gameSystemId_slug_key" ON "Faction"("gameSystemId", "slug");

-- CreateIndex
CREATE INDEX "PlayerFaction_factionId_idx" ON "PlayerFaction"("factionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerFaction_communityMemberId_factionId_key" ON "PlayerFaction"("communityMemberId", "factionId");

-- CreateIndex
CREATE INDEX "Season_communityId_startDate_idx" ON "Season"("communityId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Season_communityId_name_key" ON "Season"("communityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonSnapshot_seasonId_communityMemberId_key" ON "SeasonSnapshot"("seasonId", "communityMemberId");

-- CreateIndex
CREATE INDEX "Match_gameSystemId_playedAt_idx" ON "Match"("gameSystemId", "playedAt");

-- CreateIndex
CREATE INDEX "Match_submittedById_idx" ON "Match"("submittedById");

-- CreateIndex
CREATE INDEX "Match_playerOneId_idx" ON "Match"("playerOneId");

-- CreateIndex
CREATE INDEX "Match_playerTwoId_idx" ON "Match"("playerTwoId");

-- CreateIndex
CREATE INDEX "Match_winnerId_idx" ON "Match"("winnerId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "MatchCommunity_communityId_idx" ON "MatchCommunity"("communityId");

-- CreateIndex
CREATE INDEX "MatchCommunity_seasonId_idx" ON "MatchCommunity"("seasonId");

-- CreateIndex
CREATE INDEX "MatchCommunity_status_idx" ON "MatchCommunity"("status");

-- CreateIndex
CREATE INDEX "MatchCommunity_voidedById_idx" ON "MatchCommunity"("voidedById");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCommunity_matchId_communityId_key" ON "MatchCommunity"("matchId", "communityId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterInvite_code_key" ON "ChapterInvite"("code");

-- CreateIndex
CREATE INDEX "ChapterInvite_code_idx" ON "ChapterInvite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterInvite_communityId_key" ON "ChapterInvite"("communityId");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "GameSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faction" ADD CONSTRAINT "Faction_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "GameSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFaction" ADD CONSTRAINT "PlayerFaction_communityMemberId_fkey" FOREIGN KEY ("communityMemberId") REFERENCES "CommunityMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFaction" ADD CONSTRAINT "PlayerFaction_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonSnapshot" ADD CONSTRAINT "SeasonSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonSnapshot" ADD CONSTRAINT "SeasonSnapshot_communityMemberId_fkey" FOREIGN KEY ("communityMemberId") REFERENCES "CommunityMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "GameSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerOneId_fkey" FOREIGN KEY ("playerOneId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerTwoId_fkey" FOREIGN KEY ("playerTwoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerOneFactionId_fkey" FOREIGN KEY ("playerOneFactionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerTwoFactionId_fkey" FOREIGN KEY ("playerTwoFactionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCommunity" ADD CONSTRAINT "MatchCommunity_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCommunity" ADD CONSTRAINT "MatchCommunity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCommunity" ADD CONSTRAINT "MatchCommunity_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCommunity" ADD CONSTRAINT "MatchCommunity_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterInvite" ADD CONSTRAINT "ChapterInvite_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordChapter" ADD CONSTRAINT "DiscordChapter_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
