import { prisma } from '../../config/prisma.js'
import catalog from './cost-base-wizard.catalog.json'
import type { WizardCatalog } from './cost-base-wizard-draft.js'
import { WIZARD_TRANSACTION_OPTIONS } from './cost-base-wizard-transaction.js'
import { createVersionPlanning } from './version-planning.js'
export const versionPlanning = createVersionPlanning(work=>prisma.$transaction(work,WIZARD_TRANSACTION_OPTIONS),catalog as WizardCatalog)
