import { redirect } from "next/navigation"
import { useTranslations } from "next-intl"
import { ServerQualityClient } from "@/app/(main)/ClientComponents/quality/ServerQualityClient"
import getEnv from "@/lib/env-entry"

export default function QualityPage() {
  const t = useTranslations("QualityPage")

  // Check if driver mode supports network monitoring (required for quality analysis)
  const isKomariMode = getEnv("NEXT_PUBLIC_Komari") === "true"
  const isMyNodeQueryMode = getEnv("NEXT_PUBLIC_MyNodeQuery") === "true"

  // Quality analysis requires monitoring data, so redirect if not available
  if (isKomariMode || isMyNodeQueryMode) {
    redirect("/")
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4 md:gap-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-xl">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <ServerQualityClient />
    </main>
  )
}

