import { calculateOwnedD2DScenarios } from '../src/modules/engine/benchmark-owned-d2d'
import { ownedD2DFixture } from '../tests/fixtures/benchmark-owned-d2d'
import { parseReview } from '../../web/app/(app)/scenarios/benchmark/review-contract'
console.log(JSON.stringify(parseReview(JSON.stringify(calculateOwnedD2DScenarios(ownedD2DFixture())))))
