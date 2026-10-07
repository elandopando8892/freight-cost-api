import { createHash } from 'node:crypto'
import { prisma } from '../../config/prisma.js'
import snapshot from './cost-base-wizard.catalog.json'
import { type WizardCatalog } from './cost-base-wizard-draft.js'
import { createVersionWizard } from './cost-base-wizard-version.js'
import { WIZARD_TRANSACTION_OPTIONS } from './cost-base-wizard-transaction.js'

const catalog = snapshot as unknown as WizardCatalog
const fingerprint = createHash('sha256').update(JSON.stringify({ profile: catalog.profile, cards: catalog.cards })).digest('hex')
if (fingerprint !== catalog.revision || catalog.schema !== 'FCM_WIZARD_REFERENCE_V1') throw new Error('Invalid packaged wizard reference')
export const versionWizard = createVersionWizard(work => prisma.$transaction(work, WIZARD_TRANSACTION_OPTIONS), catalog)
