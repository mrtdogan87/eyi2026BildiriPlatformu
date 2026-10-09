import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const legacyCongress = await prisma.congress.findUnique({ where: { slug: "eyi-2026" }, select: { id: true } });
  redirect(legacyCongress ? "/eyi-2026" : "/admin");
}
