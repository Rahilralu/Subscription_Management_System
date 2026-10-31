-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('PAUSE', 'UPGRADE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SubscriptionRequest" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "type" "RequestType" NOT NULL,
    "planId" INTEGER,
    "note" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionRequest_status_idx" ON "SubscriptionRequest"("status");

-- CreateIndex
CREATE INDEX "SubscriptionRequest_customerId_idx" ON "SubscriptionRequest"("customerId");

-- CreateIndex
CREATE INDEX "SubscriptionRequest_subscriptionId_idx" ON "SubscriptionRequest"("subscriptionId");

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
