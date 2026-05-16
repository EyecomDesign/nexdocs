import { getCloudflareContext } from "@opennextjs/cloudflare"
import { cache } from "react"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function buildClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString, maxUses: 1 })
  return new PrismaClient({ adapter })
}

function readHyperdrive(env: CloudflareEnv): string {
  const hd = (env as unknown as { HYPERDRIVE?: Hyperdrive }).HYPERDRIVE
  if (!hd?.connectionString) {
    throw new Error(
      "HYPERDRIVE binding is not configured. Add a hyperdrive entry to wrangler.jsonc to enable DB-backed routes.",
    )
  }
  return hd.connectionString
}

export const getDb = cache(() => {
  const { env } = getCloudflareContext()
  return buildClient(readHyperdrive(env))
})

export const getDbAsync = async () => {
  const { env } = await getCloudflareContext({ async: true })
  return buildClient(readHyperdrive(env))
}
