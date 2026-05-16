import { getCloudflareContext } from "@opennextjs/cloudflare"
import { cache } from "react"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function buildClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString, maxUses: 1 })
  return new PrismaClient({ adapter })
}

export const getDb = cache(() => {
  const { env } = getCloudflareContext()
  return buildClient(env.HYPERDRIVE.connectionString)
})

export const getDbAsync = async () => {
  const { env } = await getCloudflareContext({ async: true })
  return buildClient(env.HYPERDRIVE.connectionString)
}
