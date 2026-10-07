import {prisma} from '../../config/prisma.js'
import catalog from './cost-base-wizard.catalog.json'
import type {WizardCatalog} from './cost-base-wizard-draft.js'
import {WIZARD_TRANSACTION_OPTIONS} from './cost-base-wizard-transaction.js'
import {createFamilyBaseStore} from './family-base-store.js'
import {decodeFamilySource} from './family-base-source.js'
import packedSource from './b2-family-source.pack.json'

const source=decodeFamilySource(packedSource)
export const familyBaseStore=createFamilyBaseStore(work=>prisma.$transaction(work,WIZARD_TRANSACTION_OPTIONS),source,catalog as WizardCatalog)
