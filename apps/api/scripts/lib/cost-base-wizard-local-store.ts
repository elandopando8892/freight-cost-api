import { randomUUID } from 'node:crypto'
import { mkdir, lstat, readFile, realpath, rename, writeFile, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createWizardDraft, restoreWizardDraft, saveWizardDraft, type WizardCatalog,
  type WizardContext, type WizardDraft } from '../../src/modules/cost-bases/cost-base-wizard-draft.js'

/** W1 isolated file adapter. One writer process; this is not tenant security or
 * the Prisma adapter. Each persisted JSON contains native inputs + decisions +
 * references + replay receipts, committed by a same-directory atomic rename. */
export class LocalWizardDraftStore {
  private queue: Promise<unknown> = Promise.resolve()
  private constructor(private readonly file: string, private readonly context: WizardContext,
    private readonly catalog: WizardCatalog) {}

  static async open(file: string, context: WizardContext, catalog: WizardCatalog) {
    const target = resolve(file), folder = dirname(target)
    await mkdir(folder, { recursive: true })
    if (await realpath(folder) !== folder) throw new Error('LOCAL_STORE_REPARSE_PATH')
    const store = new LocalWizardDraftStore(target, context, catalog)
    try { await store.read() } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      // Exclusive creation: an existing/corrupt artifact is never reset.
      await writeFile(target, JSON.stringify(createWizardDraft(context, catalog), null, 2), { flag: 'wx', mode: 0o600 })
    }
    return store
  }
  async read(): Promise<WizardDraft> {
    const stat = await lstat(this.file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error('LOCAL_STORE_UNSAFE_FILE')
    return restoreWizardDraft(JSON.parse(await readFile(this.file, 'utf8')), this.context, this.catalog)
  }
  save(command: unknown) {
    const pending = this.queue.then(async () => {
      const result = saveWizardDraft(await this.read(), command, this.catalog)
      if (result.replayed) return result
      const temporary = `${this.file}.${randomUUID()}.tmp`
      try {
        await writeFile(temporary, JSON.stringify(result.draft, null, 2), { flag: 'wx', mode: 0o600 })
        await rename(temporary, this.file)
      } finally {
        try { await unlink(temporary) } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
      }
      return result
    })
    this.queue = pending.catch(() => undefined)
    return pending
  }
}
