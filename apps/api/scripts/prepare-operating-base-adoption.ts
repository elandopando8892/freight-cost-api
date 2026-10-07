import {writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {prepareOperatingBaseAdoptionPacket} from './reconcile-economic-model-inventory.js'
const args=process.argv.slice(2)
if(args.length>1||(args.length===1&&args[0]!=='--write-packet'))throw new Error('Usage: prepare-operating-base-adoption.ts [--write-packet]')
const packet=prepareOperatingBaseAdoptionPacket()
if(args[0]==='--write-packet'){
  const path=fileURLToPath(new URL('../../../docs/research/S2_OPERATING_BASE_ADOPTION_PACKET_2026-10-05.json',import.meta.url))
  // Exclusive creation: do not silently overwrite another review artifact.
  writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{encoding:'utf8',flag:'wx'})
  console.log(JSON.stringify({artifact:path,inventory:packet.inventory,templates:packet.segmentTemplates.length,
    methodBridgeRequired:packet.pilot.methodBridgeRequired,adoptedValues:packet.adoptedValues,quoteReady:packet.quoteReady}))
}else console.log(JSON.stringify(packet,null,2))
process.exitCode=2 // Prepared, not adopted/calibrated; never signal economic acceptance.
