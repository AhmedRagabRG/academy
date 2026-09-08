import { beforeEach, describe, expect, it } from "vitest"
import { mockPipelineAdminService as service } from "@/features/pipeline-management/services/mock-pipeline-admin-service"
import { pipelineAdminKeys } from "@/features/pipeline-management/services/pipeline-admin-query-keys"

beforeEach(() => {
  service.reset()
})

describe("pipeline admin query keys", () => {
  it("are stable and hierarchical", () => {
    expect(pipelineAdminKeys.list()).toEqual(["pipeline-admin", "list"])
    expect(pipelineAdminKeys.detail("pipeline-admissions")).toEqual([
      "pipeline-admin",
      "detail",
      "pipeline-admissions",
    ])
  })
})

describe("pipeline admin mock service contract", () => {
  it("lists every pipeline including archived ones, default first", async () => {
    const rows = await service.list()
    expect(rows.map((row) => row.id)).toEqual([
      "pipeline-admissions",
      "pipeline-corporate",
      "pipeline-seasonal",
    ])
    expect(rows[0]!.isDefault).toBe(true)
    expect(rows.find((row) => row.id === "pipeline-seasonal")?.active).toBe(
      false
    )
  })

  it("rejects creating a pipeline whose code is already taken", async () => {
    await expect(
      service.create({ code: "admissions", name: "نسخة مكررة" })
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("persists the exact code and name payload on create", async () => {
    const created = await service.create({
      code: "  Referrals  ",
      name: "  مسار الإحالات  ",
    })
    expect(created.code).toBe("referrals")
    expect(created.name).toBe("مسار الإحالات")
    expect(created.isDefault).toBe(false)
    expect(created.stages).toHaveLength(0)
  })

  it("rejects a rename carrying a stale expectedVersion, exposing the current one", async () => {
    const before = await service.detail("pipeline-corporate")
    await expect(
      service.update("pipeline-corporate", {
        expectedVersion: before.version - 1,
        name: "اسم جديد",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      currentVersion: before.version,
    })
    const after = await service.detail("pipeline-corporate")
    expect(after.name).toBe(before.name)
  })

  it("switches the default pipeline atomically", async () => {
    const corporate = await service.detail("pipeline-corporate")
    const promoted = await service.update("pipeline-corporate", {
      expectedVersion: corporate.version,
      isDefault: true,
    })
    expect(promoted.isDefault).toBe(true)
    const previousDefault = await service.detail("pipeline-admissions")
    expect(previousDefault.isDefault).toBe(false)
  })

  it("refuses to delete a pipeline that still holds leads", async () => {
    const pipeline = await service.detail("pipeline-admissions")
    await expect(
      service.remove("pipeline-admissions", pipeline.version)
    ).rejects.toMatchObject({ code: "DEPENDENCY_IN_USE" })
  })

  it("refuses to delete the default pipeline even when it holds no leads", async () => {
    // pipeline-corporate has no leads, so promoting it to default isolates
    // the default-only rule from the lead-dependency rule.
    const corporate = await service.detail("pipeline-corporate")
    const promoted = await service.update("pipeline-corporate", {
      expectedVersion: corporate.version,
      isDefault: true,
    })
    await expect(
      service.remove("pipeline-corporate", promoted.version)
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("keeps exactly one entry stage when a new stage claims entry", async () => {
    const pipeline = await service.detail("pipeline-corporate")
    const created = await service.createStage(
      "pipeline-corporate",
      pipeline.version,
      {
        code: "priority-review",
        name: "مراجعة عاجلة",
        description: "",
        probability: 40,
        accent: "blue",
        outcome: "open",
        isEntry: true,
      }
    )
    const entries = created.stages.filter((stage) => stage.isEntry)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.code).toBe("priority-review")
  })

  it("refuses to archive the entry stage", async () => {
    const pipeline = await service.detail("pipeline-admissions")
    const entry = pipeline.stages.find((stage) => stage.isEntry)!
    await expect(
      service.archiveStage(
        "pipeline-admissions",
        entry.id,
        pipeline.version,
        entry.version
      )
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("refuses to delete a stage that still holds leads", async () => {
    const pipeline = await service.detail("pipeline-admissions")
    const contacted = pipeline.stages.find(
      (stage) => stage.code === "contacted"
    )!
    await expect(
      service.removeStage(
        "pipeline-admissions",
        contacted.id,
        pipeline.version,
        contacted.version
      )
    ).rejects.toMatchObject({ code: "DEPENDENCY_IN_USE" })
  })

  it("reorders every stage and increments every version, including archived ones", async () => {
    const pipeline = await service.detail("pipeline-admissions")
    const items = [...pipeline.stages]
      .sort((a, b) => b.position - a.position)
      .map((stage) => ({ id: stage.id, expectedVersion: stage.version }))

    const reordered = await service.reorderStages(
      "pipeline-admissions",
      pipeline.version,
      items
    )
    expect(reordered.stages.map((stage) => stage.id)).toEqual(
      items.map((item) => item.id)
    )
    expect(reordered.version).toBe(pipeline.version + 1)
    for (const stage of reordered.stages) {
      const original = pipeline.stages.find((item) => item.id === stage.id)!
      expect(stage.version).toBe(original.version + 1)
    }
  })

  it("rejects a reorder with a stale stage version and leaves the pipeline unchanged", async () => {
    const pipeline = await service.detail("pipeline-admissions")
    const items = pipeline.stages.map((stage) => ({
      id: stage.id,
      expectedVersion: stage.version,
    }))
    items[1]!.expectedVersion -= 1

    await expect(
      service.reorderStages("pipeline-admissions", pipeline.version, items)
    ).rejects.toMatchObject({ code: "CONFLICT" })

    const unchanged = await service.detail("pipeline-admissions")
    expect(unchanged.version).toBe(pipeline.version)
    expect(unchanged.stages.map((stage) => stage.version)).toEqual(
      pipeline.stages.map((stage) => stage.version)
    )
  })

  it("rejects a reorder missing part of the pipeline's stage membership", async () => {
    const pipeline = await service.detail("pipeline-admissions")
    await expect(
      service.reorderStages("pipeline-admissions", pipeline.version, [
        {
          id: pipeline.stages[0]!.id,
          expectedVersion: pipeline.stages[0]!.version,
        },
      ])
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })
})
