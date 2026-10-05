import { prisma } from "@/lib/prisma";
import type { CongressWithTiers } from "./payment-helpers";
export * from "./payment-helpers";

export async function getCongressWithTiers(
  slug: string,
): Promise<CongressWithTiers | null> {
  return prisma.congress.findUnique({
    where: { slug },
    include: {
      paymentTiers: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}
