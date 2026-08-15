export const isEligibleProgram = (program: {
  active: boolean
  batchingEligible: boolean
}) => program.active && program.batchingEligible
export const canEditIdentity = (codeLocked: boolean) => !codeLocked
