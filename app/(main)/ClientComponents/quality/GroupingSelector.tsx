"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

type GroupingMode = "tag" | "country" | "none"

interface GroupingSelectorProps {
  grouping: GroupingMode
  onGroupingChange: (mode: GroupingMode) => void
  availableGroups: string[]
  selectedGroup: string | null
  onSelectGroup: (group: string | null) => void
}

export function GroupingSelector({
  grouping,
  onGroupingChange,
  availableGroups,
  selectedGroup,
  onSelectGroup,
}: GroupingSelectorProps) {
  const t = useTranslations("GroupingSelector")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("grouping_title")}</CardTitle>
            <CardDescription>{t("grouping_description")}</CardDescription>
          </div>
          <div className="flex rounded-full bg-muted p-1">
            <Button
              variant={grouping === "none" ? "default" : "ghost"}
              size="sm"
              onClick={() => onGroupingChange("none")}
              className={cn("h-8 rounded-full px-3 text-xs", grouping === "none" && "shadow-sm")}
            >
              {t("no_grouping")}
            </Button>
            <Button
              variant={grouping === "tag" ? "default" : "ghost"}
              size="sm"
              onClick={() => onGroupingChange("tag")}
              className={cn("h-8 rounded-full px-3 text-xs", grouping === "tag" && "shadow-sm")}
            >
              {t("group_by_tag")}
            </Button>
            <Button
              variant={grouping === "country" ? "default" : "ghost"}
              size="sm"
              onClick={() => onGroupingChange("country")}
              className={cn("h-8 rounded-full px-3 text-xs", grouping === "country" && "shadow-sm")}
            >
              {t("group_by_country")}
            </Button>
          </div>
        </div>
      </CardHeader>

      {grouping !== "none" && availableGroups.length > 0 && (
        <CardContent className="pt-4">
          <div className="space-y-3">
            <Label className="text-sm">{t("select_group")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedGroup === null ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectGroup(null)}
                className="h-8 text-xs"
              >
                {t("all_groups")}
              </Button>
              {availableGroups.map((group) => (
                <Button
                  key={group}
                  variant={selectedGroup === group ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectGroup(group)}
                  className="h-8 text-xs"
                >
                  {group === "default" ? t("default_tag") : group}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

