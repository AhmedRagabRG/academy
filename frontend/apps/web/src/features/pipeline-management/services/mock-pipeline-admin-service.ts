import { pipelineAdminFixtures } from "../data/pipeline-admin-fixtures"
import type {
  PipelineRecord,
  PipelineStageRecord,
  StageOrderItem,
} from "../types/domain"
import { PipelineAdminError } from "./pipeline-admin-error"
import type {
  PipelineAdminService,
  PipelinePatch,
  StagePatch,
} from "./pipeline-admin-service"

const clone = <T>(value: T): T => structuredClone(value)

let pipelines: PipelineRecord[] = clone(pipelineAdminFixtures)

const conflict = (message: string, currentVersion?: number) =>
  new PipelineAdminError("CONFLICT", message, undefined, currentVersion)
const dependency = () =>
  new PipelineAdminError("DEPENDENCY_IN_USE", "لا يمكن حذف سجل مستخدم")
const notFound = () => new PipelineAdminError("NOT_FOUND", "السجل غير موجود")
const validation = (message: string) =>
  new PipelineAdminError("VALIDATION", message)

const sortStages = (pipeline: PipelineRecord) =>
  [...pipeline.stages].sort((a, b) => a.position - b.position)

const project = (pipeline: PipelineRecord): PipelineRecord =>
  clone({ ...pipeline, stages: sortStages(pipeline) })

function findPipeline(id: string): PipelineRecord {
  const pipeline = pipelines.find((item) => item.id === id)
  if (!pipeline) throw notFound()
  return pipeline
}

function findStage(
  pipeline: PipelineRecord,
  stageId: string
): PipelineStageRecord {
  const stage = pipeline.stages.find((item) => item.id === stageId)
  if (!stage) throw notFound()
  return stage
}

function checkVersion(current: number, expected: number) {
  if (current !== expected)
    throw conflict(
      "تم تعديل هذا السجل بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة.",
      current
    )
}

export const mockPipelineAdminService: PipelineAdminService = {
  async list() {
    const ordered = [...pipelines].sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault)
    )
    return Promise.resolve(ordered.map(project))
  },

  async detail(id) {
    return Promise.resolve(project(findPipeline(id)))
  },

  async create(draft) {
    const code = draft.code.trim().toLowerCase()
    if (pipelines.some((item) => item.code === code))
      return Promise.reject(conflict("رمز المسار مستخدم بالفعل"))
    const hasDefault = pipelines.some((item) => item.isDefault)
    const now = new Date().toISOString()
    const created: PipelineRecord = {
      id: `pipeline-${crypto.randomUUID()}`,
      code,
      name: draft.name.trim(),
      isDefault: !hasDefault,
      active: true,
      version: 1,
      createdAt: now,
      updatedAt: now,
      leadCount: 0,
      stages: [],
    }
    pipelines = [...pipelines, created]
    return Promise.resolve(project(created))
  },

  async update(id, patch: PipelinePatch) {
    const current = findPipeline(id)
    if (patch.isDefault === false && current.isDefault)
      return Promise.reject(
        conflict(
          "يجب أن يظل مسار واحد افتراضيًا. اجعل مسارًا آخر افتراضيًا بدلاً من ذلك"
        )
      )
    if (patch.isDefault === true) {
      if (!current.active)
        return Promise.reject(conflict("لا يمكن جعل مسار مؤرشف افتراضيًا"))
      if (!current.stages.some((stage) => stage.active))
        return Promise.reject(
          conflict(
            "أضف مرحلة نشطة واحدة على الأقل قبل جعل هذا المسار افتراضيًا"
          )
        )
    }
    checkVersion(current.version, patch.expectedVersion)
    if (patch.isDefault === true)
      pipelines = pipelines.map((item) =>
        item.id !== id && item.isDefault
          ? { ...item, isDefault: false, version: item.version + 1 }
          : item
      )
    pipelines = pipelines.map((item) =>
      item.id === id
        ? {
            ...item,
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.isDefault !== undefined
              ? { isDefault: patch.isDefault }
              : {}),
            version: item.version + 1,
            updatedAt: new Date().toISOString(),
          }
        : item
    )
    return Promise.resolve(project(findPipeline(id)))
  },

  async archive(id, expectedVersion) {
    const current = findPipeline(id)
    if (!current.active) return Promise.reject(conflict("المسار مؤرشف بالفعل"))
    if (current.isDefault)
      return Promise.reject(
        conflict(
          "لا يمكن أرشفة المسار الافتراضي. اجعل مسارًا آخر افتراضيًا أولاً"
        )
      )
    checkVersion(current.version, expectedVersion)
    current.active = false
    current.version += 1
    return Promise.resolve(project(current))
  },

  async restore(id, expectedVersion) {
    const current = findPipeline(id)
    if (current.active) return Promise.reject(conflict("المسار نشط بالفعل"))
    checkVersion(current.version, expectedVersion)
    current.active = true
    current.version += 1
    return Promise.resolve(project(current))
  },

  async remove(id, expectedVersion) {
    const current = findPipeline(id)
    checkVersion(current.version, expectedVersion)
    if (current.leadCount > 0) return Promise.reject(dependency())
    if (current.isDefault)
      return Promise.reject(
        conflict(
          "لا يمكن حذف المسار الافتراضي. اجعل مسارًا آخر افتراضيًا أولاً"
        )
      )
    if (pipelines.length <= 1)
      return Promise.reject(
        conflict("يجب أن تحتوي المؤسسة على مسار واحد على الأقل")
      )
    pipelines = pipelines.filter((item) => item.id !== id)
    return Promise.resolve()
  },

  async createStage(pipelineId, expectedPipelineVersion, draft) {
    const pipeline = findPipeline(pipelineId)
    const code = draft.code.trim().toLowerCase()
    if (pipeline.stages.some((stage) => stage.code === code))
      return Promise.reject(conflict("رمز المرحلة مستخدم بالفعل في هذا المسار"))
    checkVersion(pipeline.version, expectedPipelineVersion)
    const isFirstStage = pipeline.stages.length === 0
    const isEntry = isFirstStage ? true : Boolean(draft.isEntry)
    const position = pipeline.stages.length
      ? Math.max(...pipeline.stages.map((stage) => stage.position)) + 1
      : 0
    if (isEntry && !isFirstStage)
      pipeline.stages = pipeline.stages.map((stage) => ({
        ...stage,
        isEntry: false,
        version: stage.version + 1,
      }))
    pipeline.stages = [
      ...pipeline.stages,
      {
        id: `stage-${crypto.randomUUID()}`,
        code,
        name: draft.name.trim(),
        description: draft.description ?? "",
        probability: draft.probability ?? 0,
        accent: draft.accent ?? "slate",
        outcome: draft.outcome ?? "open",
        position,
        isEntry,
        active: true,
        version: 1,
        leadCount: 0,
      },
    ]
    pipeline.version += 1
    return Promise.resolve(project(pipeline))
  },

  async updateStage(pipelineId, stageId, patch: StagePatch) {
    const pipeline = findPipeline(pipelineId)
    const stage = findStage(pipeline, stageId)
    if (patch.isEntry === false && stage.isEntry)
      return Promise.reject(
        conflict(
          "يجب أن تبقى مرحلة واحدة نقطة دخول. اجعل مرحلة أخرى نقطة الدخول بدلاً من ذلك"
        )
      )
    if (patch.isEntry === true && !stage.active)
      return Promise.reject(
        conflict("استعد المرحلة المؤرشفة قبل جعلها نقطة الدخول")
      )
    checkVersion(pipeline.version, patch.expectedPipelineVersion)
    checkVersion(stage.version, patch.expectedVersion)
    if (patch.isEntry === true)
      pipeline.stages = pipeline.stages.map((item) =>
        item.id !== stageId && item.isEntry
          ? { ...item, isEntry: false, version: item.version + 1 }
          : item
      )
    pipeline.stages = pipeline.stages.map((item) =>
      item.id === stageId
        ? {
            ...item,
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.description !== undefined
              ? { description: patch.description }
              : {}),
            ...(patch.probability !== undefined
              ? { probability: patch.probability }
              : {}),
            ...(patch.accent !== undefined ? { accent: patch.accent } : {}),
            ...(patch.outcome !== undefined ? { outcome: patch.outcome } : {}),
            ...(patch.isEntry !== undefined ? { isEntry: patch.isEntry } : {}),
            version: item.version + 1,
          }
        : item
    )
    pipeline.version += 1
    return Promise.resolve(project(pipeline))
  },

  async archiveStage(
    pipelineId,
    stageId,
    expectedPipelineVersion,
    expectedVersion
  ) {
    const pipeline = findPipeline(pipelineId)
    const stage = findStage(pipeline, stageId)
    if (!stage.active) return Promise.reject(conflict("المرحلة مؤرشفة بالفعل"))
    if (stage.isEntry)
      return Promise.reject(
        conflict(
          "لا يمكن أرشفة مرحلة نقطة الدخول. اجعل مرحلة أخرى نقطة الدخول أولاً"
        )
      )
    const activeCount = pipeline.stages.filter((item) => item.active).length
    if (activeCount <= 1)
      return Promise.reject(conflict("يجب أن تبقى مرحلة نشطة واحدة على الأقل"))
    if (stage.leadCount > 0) return Promise.reject(dependency())
    checkVersion(pipeline.version, expectedPipelineVersion)
    checkVersion(stage.version, expectedVersion)
    stage.active = false
    stage.version += 1
    pipeline.version += 1
    return Promise.resolve(project(pipeline))
  },

  async restoreStage(
    pipelineId,
    stageId,
    expectedPipelineVersion,
    expectedVersion
  ) {
    const pipeline = findPipeline(pipelineId)
    const stage = findStage(pipeline, stageId)
    if (stage.active) return Promise.reject(conflict("المرحلة نشطة بالفعل"))
    checkVersion(pipeline.version, expectedPipelineVersion)
    checkVersion(stage.version, expectedVersion)
    stage.active = true
    stage.version += 1
    pipeline.version += 1
    return Promise.resolve(project(pipeline))
  },

  async removeStage(
    pipelineId,
    stageId,
    expectedPipelineVersion,
    expectedVersion
  ) {
    const pipeline = findPipeline(pipelineId)
    const stage = findStage(pipeline, stageId)
    if (stage.leadCount > 0) return Promise.reject(dependency())
    if (stage.isEntry)
      return Promise.reject(
        conflict(
          "لا يمكن حذف مرحلة نقطة الدخول. اجعل مرحلة أخرى نقطة الدخول أولاً"
        )
      )
    if (pipeline.stages.length <= 1)
      return Promise.reject(
        conflict("يجب أن يحتوي كل مسار على مرحلة واحدة على الأقل")
      )
    checkVersion(pipeline.version, expectedPipelineVersion)
    checkVersion(stage.version, expectedVersion)
    const remaining = pipeline.stages
      .filter((item) => item.id !== stageId)
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({ ...item, position: index }))
    pipeline.stages = remaining
    pipeline.version += 1
    return Promise.resolve(project(pipeline))
  },

  async reorderStages(
    pipelineId,
    expectedPipelineVersion,
    items: StageOrderItem[]
  ) {
    const pipeline = findPipeline(pipelineId)
    const ids = items.map((item) => item.id)
    if (new Set(ids).size !== ids.length)
      return Promise.reject(validation("قائمة الترتيب تحتوي على معرف مكرر"))
    if (
      pipeline.stages.length !== items.length ||
      pipeline.stages.some((stage) => !ids.includes(stage.id))
    )
      return Promise.reject(
        conflict("يجب إرسال جميع مراحل المسار عند إعادة الترتيب")
      )
    checkVersion(pipeline.version, expectedPipelineVersion)
    for (const item of items) {
      const stage = findStage(pipeline, item.id)
      checkVersion(stage.version, item.expectedVersion)
    }
    pipeline.version += 1
    pipeline.stages = items.map((item, index) => {
      const stage = findStage(pipeline, item.id)
      return { ...stage, position: index, version: stage.version + 1 }
    })
    return Promise.resolve(project(pipeline))
  },

  reset() {
    pipelines = clone(pipelineAdminFixtures)
  },
}
